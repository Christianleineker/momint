// Abordagem: geração da 1ª mensagem, fila de aprovação (Copiloto), envio e respostas.
import type { Canal, EstagioLead } from "@prisma/client";
import { comporPrimeiraAbordagem, type VozMarca } from "../../domain/mensagem/compositor.js";
import { referenciasDoGatilho, validarPrimeiraAbordagem } from "../../domain/mensagem/referencias.js";
import { classificarPrioridade } from "../../domain/lead/prioridade.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { UnitOfWork } from "../../infra/database/unit-of-work.js";
import type { Relogio } from "../../ports/relogio.js";
import { nomeEmpresa } from "../../shared/apresentacao.js";
import { Conflito, NaoEncontrado, RegraDeNegocio } from "../../shared/erros.js";
import { contextoDoGatilho, gatilhosAtivosPorEmpresa } from "../comum/gatilhos.js";
import type { SupressaoService } from "../contatos/supressao.service.js";

const ABORDAVEIS: EstagioLead[] = ["APTO", "RECICLADO"];

/** Canal pedido, se o contato tiver o endereço dele; senão, o outro canal que ele tiver. */
function canalDoContato(contato: { email: string | null; telefone: string | null }, pedido: Canal): Canal | null {
  const disponivel = (c: Canal) => Boolean(c === "EMAIL" ? contato.email : contato.telefone);
  if (disponivel(pedido)) return pedido;
  const outro: Canal = pedido === "EMAIL" ? "WHATSAPP" : "EMAIL";
  return disponivel(outro) ? outro : null;
}

export interface EdicaoMensagem {
  assunto?: string | null;
  conteudo: string;
}

export class AbordagemService {
  constructor(
    private readonly repos: Repositorios,
    private readonly uow: UnitOfWork,
    private readonly supressao: SupressaoService,
    private readonly relogio: Relogio,
  ) {}

  /** Gera a 1ª abordagem. Copiloto → rascunho na fila (regra 4); Autopilot → envio direto.
   *  Lead sem responsável passa a ser de quem gerou a abordagem, que assina a mensagem. */
  async abordar(clienteId: string, leadId: string, canal: Canal = "EMAIL", autorId?: string) {
    const lead = await this.repos.leads.buscarParaAbordagem(clienteId, leadId);
    if (!lead) throw new NaoEncontrado("Lead não encontrado");
    if (!ABORDAVEIS.includes(lead.estagio)) throw new Conflito("Só é possível abordar leads aptos ou reciclados");

    // O texto comercial vem do que o cliente vende: sem oferta, não há mensagem.
    const oferta = await this.repos.ofertas.buscarDoCliente(clienteId);
    if (!oferta) throw new RegraDeNegocio("Cadastre o que sua empresa vende em Filtro e Segmentação para gerar a abordagem");

    const contato = await this.supressao.contatoAbordavel(lead.empresaId);
    if (!contato) {
      await this.repos.leads.atualizar(lead.id, { estagio: "SEM_CONTATO" });
      throw new Conflito("Nenhum contato abordável (sem contato ou todos em opt-out)");
    }
    const canalUsado = canalDoContato(contato, canal);
    if (!canalUsado) throw new Conflito("O contato não tem e-mail nem telefone para a abordagem");

    const autor = !lead.dono && autorId ? await this.repos.usuarios.buscarDoCliente(clienteId, autorId) : null;
    const responsavel = lead.dono ?? autor;

    const gatilho = contextoDoGatilho(lead.evento);
    const gerada = comporPrimeiraAbordagem({
      evento: gatilho,
      empresa: { nome: nomeEmpresa(lead.empresa) },
      contato,
      remetente: { nome: responsavel?.nome ?? lead.cliente.nome, empresa: lead.cliente.nome },
      oferta,
      canal: canalUsado,
      voz: lead.cliente.vozMarca as VozMarca,
    });
    const validacao = validarPrimeiraAbordagem(gerada.conteudo, gatilho);
    if (!validacao.valida) throw new RegraDeNegocio(`Geração rejeitada: ${validacao.erro}`);

    const autopilot = lead.cliente.modoOperacao === "AUTOPILOT";
    return this.uow.executar(async (r) => {
      const mensagem = await r.mensagens.criar({
        leadId: lead.id,
        contatoId: contato.id,
        canal: canalUsado,
        direcao: "SAIDA",
        passo: 1,
        geradaPorIA: true,
        status: autopilot ? "ENVIADA" : "RASCUNHO",
        assunto: gerada.assunto,
        conteudo: gerada.conteudo,
        enviadaEm: autopilot ? new Date() : null,
      });
      await r.leads.atualizar(lead.id, { estagio: autopilot ? "EM_CADENCIA" : "AGUARDANDO_APROVACAO", ...(autor ? { donoId: autor.id } : {}) });
      return mensagem;
    });
  }

  async listarFila(clienteId: string) {
    const mensagens = await this.repos.mensagens.listarFilaDeAprovacao(clienteId);
    const ativos = await gatilhosAtivosPorEmpresa(this.repos, mensagens.map((m) => m.lead.empresaId), this.relogio.agora());
    return mensagens.map((m) => ({
      id: m.id,
      canal: m.canal,
      assunto: m.assunto,
      conteudo: m.conteudo,
      geradaPorIA: m.geradaPorIA,
      passo: m.passo,
      criadoEm: m.criadoEm,
      contato: m.contato ? { nome: m.contato.nome, cargo: m.contato.cargo, email: m.contato.email, telefone: m.contato.telefone } : null,
      lead: {
        id: m.lead.id,
        empresa: nomeEmpresa(m.lead.empresa),
        municipio: m.lead.empresa.municipio,
        dono: m.lead.dono?.nome ?? null,
        prioridade: classificarPrioridade(m.lead.scorePrioridade, ativos.get(m.lead.empresaId)?.length ?? 0),
      },
      gatilho: { codigo: m.lead.evento.tipo.codigo, resumo: m.lead.evento.resumo, referencias: referenciasDoGatilho(contextoDoGatilho(m.lead.evento)) },
    }));
  }

  async editarRascunho(clienteId: string, id: string, edicao: EdicaoMensagem) {
    const msg = await this.rascunhoDoCliente(clienteId, id);
    this.garantirCitacaoDoGatilho(msg, edicao.conteudo);
    return this.repos.mensagens.atualizar(id, { conteudo: edicao.conteudo, assunto: edicao.assunto ?? msg.assunto });
  }

  /** Aprovar = enviar (envio mockado). Tira da fila e move o lead para Em cadência. */
  async aprovar(clienteId: string, usuarioId: string, id: string, edicao?: EdicaoMensagem) {
    const msg = await this.rascunhoDoCliente(clienteId, id);
    const conteudo = edicao?.conteudo ?? msg.conteudo;
    this.garantirCitacaoDoGatilho(msg, conteudo);

    if (msg.contato && (await this.supressao.estaSuprimido(msg.contato))) {
      await this.repos.mensagens.atualizar(id, { status: "REJEITADA" });
      throw new Conflito("Contato em opt-out — mensagem bloqueada");
    }

    return this.uow.executar(async (r) => {
      const enviada = await r.mensagens.atualizar(id, {
        status: "ENVIADA",
        conteudo,
        assunto: edicao?.assunto ?? msg.assunto,
        aprovadaPorId: usuarioId,
        enviadaEm: new Date(),
      });
      if (msg.lead.estagio === "AGUARDANDO_APROVACAO") await r.leads.atualizar(msg.leadId, { estagio: "EM_CADENCIA" });
      return enviada;
    });
  }

  async rejeitar(clienteId: string, id: string) {
    const msg = await this.rascunhoDoCliente(clienteId, id);
    await this.uow.executar(async (r) => {
      await r.mensagens.atualizar(id, { status: "REJEITADA" });
      const restantes = await r.mensagens.contarRascunhosDoLead(msg.leadId);
      if (restantes === 0 && msg.lead.estagio === "AGUARDANDO_APROVACAO") await r.leads.atualizar(msg.leadId, { estagio: "APTO" });
    });
  }

  /** Resposta recebida (simulada no MVP): para a cadência e engaja o lead. */
  async registrarResposta(clienteId: string, leadId: string, dados: { canal: Canal; conteudo: string; quente: boolean }) {
    const lead = await this.repos.leads.buscarDoCliente(clienteId, leadId);
    if (!lead) throw new NaoEncontrado("Lead não encontrado");
    const contato = await this.repos.empresas.primeiroContato(lead.empresaId);

    return this.uow.executar(async (r) => {
      await r.mensagens.marcarEnviadasComoRespondidas(leadId);
      const resposta = await r.mensagens.criar({
        leadId,
        contatoId: contato?.id,
        canal: dados.canal,
        direcao: "ENTRADA",
        status: "RESPONDIDA",
        conteudo: dados.conteudo,
        quente: dados.quente,
        enviadaEm: new Date(),
      });
      if (lead.estagio === "EM_CADENCIA") await r.leads.atualizar(leadId, { estagio: "ENGAJADO" });
      return resposta;
    });
  }

  private async rascunhoDoCliente(clienteId: string, id: string) {
    const msg = await this.repos.mensagens.buscarDoCliente(clienteId, id);
    if (!msg) throw new NaoEncontrado("Mensagem não encontrada");
    if (msg.status !== "RASCUNHO") throw new Conflito("Mensagem não está aguardando aprovação");
    return msg;
  }

  /** Regra 5: a 1ª abordagem (passo 1) precisa citar o gatilho específico. */
  private garantirCitacaoDoGatilho(msg: { passo: number | null; lead: { evento: Parameters<typeof contextoDoGatilho>[0] } }, conteudo: string) {
    if (msg.passo !== 1) return;
    const v = validarPrimeiraAbordagem(conteudo, contextoDoGatilho(msg.lead.evento));
    if (!v.valida) throw new RegraDeNegocio(v.erro!);
  }
}
