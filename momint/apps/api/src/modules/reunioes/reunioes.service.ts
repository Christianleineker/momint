import type { EstagioLead } from "@prisma/client";
import { gerarBriefing } from "../../domain/mensagem/compositor.js";
import { podeAgendar, ROTULO_ESTAGIO } from "../../domain/lead/estados.js";
import { idadeEmAnos } from "../../domain/icp/fit.js";
import type { Repositorios } from "../../infra/database/repositories/index.js";
import type { UnitOfWork } from "../../infra/database/unit-of-work.js";
import { nomeEmpresa } from "../../shared/apresentacao.js";
import { Conflito, NaoEncontrado, RegraDeNegocio } from "../../shared/erros.js";
import { contextoDoGatilho } from "../comum/gatilhos.js";
import type { LeadsService } from "../leads/leads.service.js";

const AGENDAVEIS: EstagioLead[] = ["ENGAJADO", "QUALIFICANDO"];

export interface NovoAgendamento {
  inicio: Date;
  duracaoMin: number;
  vendedorId?: string;
}

export class ReunioesService {
  constructor(
    private readonly repos: Repositorios,
    private readonly uow: UnitOfWork,
    private readonly leads: LeadsService,
  ) {}

  async listar(clienteId: string) {
    const reunioes = await this.repos.reunioes.listarDoCliente(clienteId);
    return reunioes.map((r) => ({
      id: r.id,
      inicio: r.inicio,
      fim: r.fim,
      status: r.status,
      briefing: r.briefing,
      vendedor: r.vendedor?.nome ?? null,
      lead: { id: r.lead.id, estagio: r.lead.estagio, empresa: nomeEmpresa(r.lead.empresa), municipio: r.lead.empresa.municipio, gatilho: r.lead.evento.tipo.codigo },
    }));
  }

  /** Regra 6: só agenda com necessidade, momento e encaixe marcados (ou override manual). */
  async agendar(clienteId: string, leadId: string, dados: NovoAgendamento) {
    const lead = await this.repos.leads.buscarParaAgendamento(clienteId, leadId);
    if (!lead) throw new NaoEncontrado("Lead não encontrado");
    if (!podeAgendar(lead)) throw new RegraDeNegocio("Qualificação incompleta: marque necessidade, momento e encaixe (ou force manualmente)");
    if (!AGENDAVEIS.includes(lead.estagio)) throw new Conflito(`Não é possível agendar a partir de "${ROTULO_ESTAGIO[lead.estagio]}"`);

    const eventos = await this.repos.eventos.listarDaEmpresa(lead.empresaId);
    const briefing = gerarBriefing({
      empresa: {
        nome: nomeEmpresa(lead.empresa),
        municipio: lead.empresa.municipio,
        porte: lead.empresa.porte,
        cnaeDescricao: lead.empresa.cnaeDescricao,
        idadeAnos: idadeEmAnos(lead.empresa.dataInicioAtividade, dados.inicio),
      },
      gatilhos: eventos.map(contextoDoGatilho),
      qualificacao: lead,
      ultimaResposta: lead.mensagens[0]?.conteudo,
    });

    return this.uow.executar(async (r) => {
      const reuniao = await r.reunioes.criar({
        leadId,
        vendedorId: dados.vendedorId ?? lead.donoId,
        inicio: dados.inicio,
        fim: new Date(dados.inicio.getTime() + dados.duracaoMin * 60_000),
        briefing,
      });
      await r.leads.atualizar(leadId, { estagio: "REUNIAO_MARCADA" });
      return reuniao;
    });
  }

  async atualizarStatus(clienteId: string, id: string, status: "REALIZADA" | "CANCELADA" | "NO_SHOW") {
    const reuniao = await this.repos.reunioes.buscarDoCliente(clienteId, id);
    if (!reuniao) throw new NaoEncontrado("Reunião não encontrada");

    if (status === "REALIZADA") {
      await this.leads.moverEstagio(clienteId, reuniao.leadId, "REUNIAO_REALIZADA");
      return;
    }
    await this.repos.reunioes.atualizarStatus(id, status);
    // Cancelada/no-show devolve o lead para qualificação (permite reagendar).
    if (reuniao.lead.estagio === "REUNIAO_MARCADA") await this.leads.moverEstagio(clienteId, reuniao.leadId, "QUALIFICANDO");
  }
}
