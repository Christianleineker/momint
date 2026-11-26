// Radar: ingere gatilhos das fontes públicas para a camada compartilhada e roda
// o motor de match (fit ICP + frescor → lead) para cada cliente.
import type { Canal, CodigoGatilho, Prisma, TipoDeGatilho } from "@prisma/client";
import type { MinhaReceitaCnpj } from "../../domain/gatilho/dados-publicos.js";
import { calcularFrescor } from "../../domain/gatilho/frescor.js";
import { avaliarFit } from "../../domain/icp/fit.js";
import { planejarLead } from "../../domain/lead/planejamento.js";
import { classificarPrioridade } from "../../domain/lead/prioridade.js";
import { titulo } from "../../domain/mensagem/formatacao.js";
import { descreverGatilho } from "../../domain/mensagem/referencias.js";
import { DIA_MS } from "../../domain/shared/numeros.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { FontesPublicas } from "../../ports/fontes-publicas.js";
import type { Geocodificador } from "../../ports/geocodificador.js";
import type { Relogio } from "../../ports/relogio.js";
import { mascararCnpj, nomeEmpresa } from "../../shared/apresentacao.js";
import { Conflito, NaoEncontrado } from "../../shared/erros.js";
import { normalizarMunicipio } from "../../shared/texto.js";
import { emLotes } from "../../shared/lotes.js";
import type { AbordagemService } from "../abordagem/abordagem.service.js";

/** Quanto do passado cada varredura das fontes cobre. */
const HORIZONTE_INGESTAO_DIAS = 120;
/** Consultas simultâneas à API pública de CNPJ durante a varredura. */
const CONSULTAS_CNPJ_SIMULTANEAS = 4;

export type StatusRadar = "APTO" | "EXPIRADO" | "FORA_DO_ICP" | "FONTE_INATIVA";

export class RadarService {
  constructor(
    private readonly repos: Repositorios,
    private readonly fontes: FontesPublicas,
    private readonly geo: Geocodificador,
    private readonly relogio: Relogio,
    private readonly abordagem: AbordagemService,
  ) {}

  /** Varre as fontes e grava EmpresaAlvo + EventoDeGatilho (camada compartilhada). */
  async ingerirFontes(fontesAtivas?: readonly string[]) {
    const hoje = this.relogio.agora();
    const desde = new Date(hoje.getTime() - HORIZONTE_INGESTAO_DIAS * DIA_MS);
    const tipos = await this.repos.eventos.tiposPorCodigo();
    let eventosProcessados = 0;
    const fontesIndisponiveis: string[] = [];

    // Uma fonte fora do ar (ou sem integração disponível) não impede as outras.
    const varrer = async (fonte: string, codigo: string, tarefa: () => Promise<void>) => {
      if (fontesAtivas && !fontesAtivas.includes(codigo)) return;
      try {
        await tarefa();
      } catch (e) {
        fontesIndisponiveis.push(`${fonte}: ${e instanceof Error ? e.message : "indisponível"}`);
      }
    };

    await varrer("CNO", "CNO", async () => {
      for (const obra of await this.fontes.cno.obrasRegistradas(desde, "PR")) {
        const cadastro = await this.fontes.cnpj.buscar(obra.niResponsavel);
        if (!cadastro) continue;
        await this.registrar(tipos, "CNO", cadastro, `CNO:${obra.cno}`, new Date(`${obra.dataRegistro}T12:00:00Z`), obra);
        eventosProcessados++;
      }
    });
    await varrer("PNCP", "PNCP", async () => {
      const licitacoes = (await this.fontes.pncp.contratacoesPublicadas(desde, hoje)).filter((l) => l.cnpjInteressado);
      const cadastros = await this.cadastrosCnpj(licitacoes.map((l) => l.cnpjInteressado));
      for (const lic of licitacoes) {
        const cadastro = cadastros.get(lic.cnpjInteressado);
        if (!cadastro) continue;
        // O gatilho é a vitória na licitação: vale a data do resultado, não a do edital.
        const detectadoEm = lic.resultado ? new Date(`${lic.resultado.dataResultado}T12:00:00Z`) : new Date(lic.dataPublicacaoPncp);
        await this.registrar(tipos, "PNCP", cadastro, `PNCP:${lic.numeroControlePNCP}`, detectadoEm, lic);
        eventosProcessados++;
      }
    });
    await varrer("CNPJ novo", "CNPJ_NOVO", async () => {
      for (const cadastro of await this.fontes.cnpj.novasEmpresas(desde)) {
        await this.registrar(tipos, "CNPJ_NOVO", cadastro, `CNPJ_NOVO:${cadastro.cnpj}`, new Date(`${cadastro.data_inicio_atividade}T12:00:00Z`), cadastro);
        eventosProcessados++;
      }
    });
    return { eventosProcessados, fontesIndisponiveis };
  }

  /** Motor de match de um cliente: cria/atualiza leads a partir de todos os gatilhos. */
  async processarCliente(clienteId: string) {
    const hoje = this.relogio.agora();
    const cliente = await this.repos.clientes.buscarComIcp(clienteId);
    if (!cliente?.ativo || !cliente.icp) return { criados: 0, atualizados: 0 };
    const icp = cliente.icp;

    const [empresas, leads, vendedores] = await Promise.all([
      this.repos.empresas.listarComEventos(),
      this.repos.leads.listarParaProcessamento(clienteId),
      this.repos.usuarios.listarVendedoresAtivos(clienteId),
    ]);
    const leadPorEmpresa = new Map(leads.map((l) => [l.empresaId, l]));

    let criados = 0;
    let atualizados = 0;
    for (const empresa of empresas) {
      if (empresa.eventos.length === 0) continue;
      const fit = avaliarFit(empresa, icp, hoje);
      const lead = leadPorEmpresa.get(empresa.id) ?? null;
      const plano = planejarLead({
        fit,
        eventos: empresa.eventos.map((ev) => ({ id: ev.id, codigo: ev.tipo.codigo, detectadoEm: ev.detectadoEm, janelaFrescorDias: ev.tipo.janelaFrescorDias, peso: ev.tipo.peso })),
        fontesAtivas: icp.fontesAtivas,
        lead: lead ? { estagio: lead.estagio, eventoDetectadoEm: lead.evento.detectadoEm } : null,
        taxaConversaoHist: cliente.taxaConversaoHist,
        hoje,
      });

      if (plano.acao === "CRIAR") {
        // Distribuição round-robin entre os vendedores ativos.
        const dono = vendedores.length ? vendedores[(leads.length + criados) % vendedores.length] : null;
        await this.repos.leads.criar({ clienteId, empresaId: empresa.id, eventoId: plano.eventoId, estagio: plano.estagio, scorePrioridade: plano.score, forcaFit: fit.forca, donoId: dono?.id });
        criados++;
      } else if (plano.acao === "ATUALIZAR" && lead) {
        await this.repos.leads.atualizar(lead.id, {
          estagio: plano.estagio,
          scorePrioridade: plano.score,
          forcaFit: fit.forca,
          ...(plano.eventoId ? { eventoId: plano.eventoId } : {}),
        });
        atualizados++;
      }
    }
    return { criados, atualizados };
  }

  async sincronizar(clienteId?: string) {
    const clientes = clienteId ? [{ id: clienteId }] : await this.repos.clientes.listarIds();
    const perfis = await Promise.all(clientes.map(({ id }) => this.repos.icp.buscarDoCliente(id)));
    const fontesAtivas = [...new Set(perfis.flatMap((perfil) => perfil?.fontesAtivas ?? []))];
    const ingestao = await this.ingerirFontes(fontesAtivas);
    const porCliente = [];
    for (const { id } of clientes) {
      porCliente.push({ clienteId: id, ...(await this.processarCliente(id)) });
    }
    return { ...ingestao, porCliente };
  }

  /** Todos os eventos avaliados contra o ICP do cliente (tela Radar de Gatilhos). */
  async listar(clienteId: string) {
    const hoje = this.relogio.agora();
    const icp = await this.repos.icp.buscarDoCliente(clienteId);
    if (!icp) return [];
    if (!icp.cnaes.length || !icp.portes.length || !icp.cidadeBase) return [];
    const [eventos, leads] = await Promise.all([this.repos.eventos.listarComEmpresa(), this.repos.leads.listarResumo(clienteId)]);
    const leadPorEmpresa = new Map(leads.map((l) => [l.empresaId, l]));

    const avaliados = eventos.map((ev) => {
      const fit = avaliarFit(ev.empresa, icp, hoje);
      const frescor = calcularFrescor(ev.detectadoEm, ev.tipo, hoje);
      const status: StatusRadar = !icp.fontesAtivas.includes(ev.tipo.codigo)
        ? "FONTE_INATIVA"
        : !fit.apto
          ? "FORA_DO_ICP"
          : !frescor.dentroDaJanela
            ? "EXPIRADO"
            : "APTO";
      return { ev, fit, frescor, status };
    });

    const empilhados = new Map<string, number>();
    for (const { ev, status } of avaliados) {
      if (status === "APTO") empilhados.set(ev.empresaId, (empilhados.get(ev.empresaId) ?? 0) + 1);
    }

    return avaliados.map(({ ev, fit, frescor, status }) => {
      const lead = leadPorEmpresa.get(ev.empresaId) ?? null;
      const gatilhosEmpilhados = empilhados.get(ev.empresaId) ?? 0;
      const score = lead?.scorePrioridade ?? 0;
      return {
        id: ev.id,
        tipo: ev.tipo.codigo,
        tipoNome: ev.tipo.nome,
        resumo: ev.resumo,
        detectadoEm: ev.detectadoEm,
        diasDecorridos: frescor.diasDecorridos,
        frescor: frescor.score,
        empresa: { id: ev.empresa.id, nome: nomeEmpresa(ev.empresa), cnpj: mascararCnpj(ev.empresa.cnpj), municipio: ev.empresa.municipio, uf: ev.empresa.uf },
        criteriosFit: fit.criterios,
        distanciaKm: fit.distanciaKm,
        status,
        gatilhosEmpilhados,
        score,
        prioridade: status === "APTO" ? classificarPrioridade(score, gatilhosEmpilhados) : "BAIXA",
        lead: lead ? { id: lead.id, estagio: lead.estagio } : null,
      };
    });
  }

  /** "Adicionar à fila": gera o rascunho de 1ª abordagem para a empresa do evento. */
  async adicionarAFila(clienteId: string, eventoId: string, canal: Canal, autorId?: string) {
    const evento = await this.repos.eventos.buscarPorId(eventoId);
    if (!evento) throw new NaoEncontrado("Evento não encontrado");
    const lead = await this.repos.leads.buscarPorEmpresa(clienteId, evento.empresaId);
    if (!lead) throw new Conflito("Empresa não passou no filtro de ICP/frescor");
    return this.abordagem.abordar(clienteId, lead.id, canal, autorId);
  }

  private async registrar(
    tipos: Record<CodigoGatilho, TipoDeGatilho>,
    codigo: CodigoGatilho,
    cadastro: MinhaReceitaCnpj,
    externalId: string,
    detectadoEm: Date,
    bruto: object,
  ) {
    const empresa = await this.repos.empresas.upsertPorCnpj(cadastro.cnpj, await this.firmografia(cadastro));
    await this.repos.cnaes.registrar(empresa.cnae, empresa.cnaeDescricao);
    await this.contatoPublico(empresa.id, cadastro);
    return this.repos.eventos.registrar({
      externalId,
      empresaId: empresa.id,
      tipoId: tipos[codigo].id,
      detectadoEm,
      resumo: descreverGatilho({ codigo, detectadoEm, dadosBrutos: bruto }),
      dadosBrutos: bruto as Prisma.InputJsonValue,
    });
  }

  /** Cadastros CNPJ das empresas, sem repetir CNPJ e poucos por vez (API pública).
   *  Um CNPJ que falhar fica de fora desta varredura, sem derrubar as demais. */
  private async cadastrosCnpj(cnpjs: string[]) {
    const unicos = [...new Set(cnpjs)];
    const cadastros = await emLotes(unicos, CONSULTAS_CNPJ_SIMULTANEAS, (cnpj) => this.fontes.cnpj.buscar(cnpj).catch(() => null));
    const porCnpj = new Map<string, MinhaReceitaCnpj>();
    unicos.forEach((cnpj, i) => {
      const cadastro = cadastros[i];
      if (cadastro) porCnpj.set(cnpj, cadastro);
    });
    return porCnpj;
  }

  /** Empresa ainda sem contato ganha um a partir do quadro societário público (QSA):
   *  o sócio-administrador, com o e-mail e o telefone que a empresa informou à Receita. */
  private async contatoPublico(empresaId: string, e: MinhaReceitaCnpj) {
    if (!e.email && !e.ddd_telefone_1) return;
    if ((await this.repos.empresas.listarContatos(empresaId)).length) return;
    const socios = e.qsa ?? [];
    const socio = socios.find((s) => /administrador/i.test(s.qualificacao_socio)) ?? socios[0];
    if (!socio) return;
    await this.repos.empresas.criarContato({
      empresaId,
      nome: titulo(socio.nome_socio),
      cargo: socio.qualificacao_socio,
      email: e.email?.toLowerCase() ?? null,
      telefone: e.ddd_telefone_1 ?? null,
      origem: "RECEITA_FEDERAL",
    });
  }

  /** Cadastro CNPJ (formato minhareceita) → firmografia do cache EmpresaAlvo. */
  private async firmografia(e: MinhaReceitaCnpj) {
    const coord = await this.geo.coordenadas(e.municipio, e.uf);
    return {
      razaoSocial: e.razao_social,
      nomeFantasia: e.nome_fantasia ?? null,
      cnae: String(e.cnae_fiscal),
      cnaeDescricao: e.cnae_fiscal_descricao,
      porte: e.porte,
      situacao: e.descricao_situacao_cadastral,
      dataInicioAtividade: new Date(`${e.data_inicio_atividade}T00:00:00Z`),
      uf: e.uf,
      municipio: normalizarMunicipio(e.municipio),
      bairro: e.bairro ?? null,
      lat: coord?.[0] ?? null,
      lng: coord?.[1] ?? null,
      telefone: e.ddd_telefone_1 ?? null,
      email: e.email ?? null,
      qsa: e.qsa as unknown as Prisma.InputJsonValue,
    };
  }
}
