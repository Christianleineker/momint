import type { ResultadoDesfecho } from "@prisma/client";
import { podeAgendar, podeTransicionar, ROTULO_ESTAGIO, transicoesPossiveis, type Estagio } from "../../domain/lead/estados.js";
import { classificarPrioridade } from "../../domain/lead/prioridade.js";
import { idadeEmAnos } from "../../domain/icp/fit.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { UnitOfWork } from "../../infra/database/unit-of-work.js";
import type { Relogio } from "../../ports/relogio.js";
import { mascararCnpj, nomeEmpresa } from "../../shared/apresentacao.js";
import { Conflito, NaoEncontrado } from "../../shared/erros.js";
import { gatilhosAtivosPorEmpresa } from "../comum/gatilhos.js";
import type { SupressaoService } from "../contatos/supressao.service.js";

/** Estágios que encerram o lead registram um Desfecho (alimenta as métricas). */
const DESFECHO_POR_ESTAGIO: Partial<Record<Estagio, ResultadoDesfecho>> = {
  GANHO: "NEGOCIO_FECHADO",
  PERDIDO: "PERDIDO",
  DESQUALIFICADO: "DESQUALIFICADO",
  REUNIAO_REALIZADA: "REUNIAO_REALIZADA",
};

/** Estágios que só podem ser alcançados por uma ação específica. */
const EXIGEM_ACAO: Partial<Record<Estagio, string>> = {
  REUNIAO_MARCADA: "Use a ação Agendar reunião (exige qualificação)",
  AGUARDANDO_APROVACAO: "Use a ação Abordar para gerar a mensagem",
};

export interface Qualificacao {
  necessidade?: boolean;
  momento?: boolean;
  encaixe?: boolean;
  qualificacaoForcada?: boolean;
}

export class LeadsService {
  constructor(
    private readonly repos: Repositorios,
    private readonly uow: UnitOfWork,
    private readonly supressao: SupressaoService,
    private readonly relogio: Relogio,
  ) {}

  async listar(clienteId: string) {
    const leads = await this.repos.leads.listarDoCliente(clienteId);
    const ativos = await gatilhosAtivosPorEmpresa(this.repos, leads.map((l) => l.empresaId), this.relogio.agora());
    return leads.map((l) => {
      const gatilhos = ativos.get(l.empresaId) ?? [];
      return {
        id: l.id,
        estagio: l.estagio,
        score: l.scorePrioridade,
        prioridade: classificarPrioridade(l.scorePrioridade, gatilhos.length),
        empresa: { nome: nomeEmpresa(l.empresa), cnpj: mascararCnpj(l.empresa.cnpj), municipio: l.empresa.municipio, porte: l.empresa.porte },
        gatilho: { codigo: l.evento.tipo.codigo, resumo: l.evento.resumo, detectadoEm: l.evento.detectadoEm },
        gatilhosAtivos: gatilhos.map((g) => g.codigo),
        dono: l.dono,
        atualizadoEm: l.atualizadoEm,
      };
    });
  }

  async detalhar(clienteId: string, id: string) {
    const lead = await this.repos.leads.buscarDetalhe(clienteId, id);
    if (!lead) throw new NaoEncontrado("Lead não encontrado");
    const hoje = this.relogio.agora();
    const ativos = (await gatilhosAtivosPorEmpresa(this.repos, [lead.empresaId], hoje)).get(lead.empresaId) ?? [];
    const e = lead.empresa;

    return {
      id: lead.id,
      estagio: lead.estagio,
      score: lead.scorePrioridade,
      forcaFit: lead.forcaFit,
      prioridade: classificarPrioridade(lead.scorePrioridade, ativos.length),
      qualificacao: { necessidade: lead.necessidade, momento: lead.momento, encaixe: lead.encaixe, qualificacaoForcada: lead.qualificacaoForcada },
      podeAgendar: podeAgendar(lead),
      transicoes: transicoesPossiveis(lead.estagio),
      dono: lead.dono,
      empresa: {
        nome: nomeEmpresa(e),
        razaoSocial: e.razaoSocial,
        cnpj: mascararCnpj(e.cnpj),
        cnae: e.cnae,
        cnaeDescricao: e.cnaeDescricao,
        porte: e.porte,
        situacao: e.situacao,
        municipio: e.municipio,
        uf: e.uf,
        bairro: e.bairro,
        idadeAnos: Math.floor(idadeEmAnos(e.dataInicioAtividade, hoje)),
        qsa: e.qsa,
      },
      gatilhoPrincipal: { id: lead.evento.id, codigo: lead.evento.tipo.codigo, resumo: lead.evento.resumo, detectadoEm: lead.evento.detectadoEm, dados: lead.evento.dadosBrutos },
      gatilhos: e.eventos.map((ev) => ({ id: ev.id, codigo: ev.tipo.codigo, resumo: ev.resumo, detectadoEm: ev.detectadoEm, ativo: ativos.some((a) => a.id === ev.id) })),
      contatos: await Promise.all(e.contatos.map(async (c) => ({ ...c, suprimido: await this.supressao.estaSuprimido(c) }))),
      mensagens: lead.mensagens,
      reunioes: lead.reunioes,
      desfecho: lead.desfecho,
    };
  }

  /** Transição validada pela máquina de estados (Kanban e ações do detalhe). */
  async moverEstagio(clienteId: string, id: string, para: Estagio, motivo?: string) {
    const lead = await this.repos.leads.buscarDoCliente(clienteId, id);
    if (!lead) throw new NaoEncontrado("Lead não encontrado");
    const de = lead.estagio;
    if (de === para) return lead;
    if (!podeTransicionar(de, para)) throw new Conflito(`Transição inválida: ${ROTULO_ESTAGIO[de]} → ${ROTULO_ESTAGIO[para]}`);
    const acaoExigida = EXIGEM_ACAO[para];
    if (acaoExigida) throw new Conflito(acaoExigida);

    return this.uow.executar(async (r) => {
      const resultado = DESFECHO_POR_ESTAGIO[para];
      if (resultado) await r.leads.registrarDesfecho(id, resultado, motivo);
      if (para === "REUNIAO_REALIZADA") await r.reunioes.marcarAgendadasComoRealizadas(id);
      return r.leads.atualizar(id, { estagio: para });
    });
  }

  async atualizarQualificacao(clienteId: string, id: string, q: Qualificacao) {
    const lead = await this.repos.leads.buscarDoCliente(clienteId, id);
    if (!lead) throw new NaoEncontrado("Lead não encontrado");
    // Marcar qualquer critério num lead engajado inicia a qualificação.
    const iniciaQualificacao = lead.estagio === "ENGAJADO" && Object.values(q).some(Boolean);
    return this.repos.leads.atualizar(id, { ...q, ...(iniciaQualificacao ? { estagio: "QUALIFICANDO" } : {}) });
  }

  async alterarDono(clienteId: string, id: string, donoId: string) {
    const dono = await this.repos.usuarios.buscarDoCliente(clienteId, donoId);
    if (!dono) throw new NaoEncontrado("Vendedor não encontrado");
    if (!(await this.repos.leads.atualizarDono(clienteId, id, donoId))) throw new NaoEncontrado("Lead não encontrado");
  }
}
