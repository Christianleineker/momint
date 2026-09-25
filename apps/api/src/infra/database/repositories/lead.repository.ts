import type { EstagioLead, Prisma, ResultadoDesfecho } from "@prisma/client";
import type { DbClient } from "../prisma.js";

const ESTAGIOS_FINAIS: EstagioLead[] = ["GANHO", "PERDIDO", "SUPRIMIDO", "DESQUALIFICADO"];
const DONO = { select: { id: true, nome: true } } as const;
const EVENTO_COM_TIPO = { include: { tipo: true } } as const;

/** Todas as consultas de lead são filtradas por clienteId (isolamento multi-cliente). */
export class LeadRepository {
  constructor(private readonly db: DbClient) {}

  listarDoCliente(clienteId: string) {
    return this.db.lead.findMany({
      where: { clienteId },
      include: { empresa: true, evento: EVENTO_COM_TIPO, dono: DONO },
      orderBy: { scorePrioridade: "desc" },
    });
  }

  listarParaProcessamento(clienteId: string) {
    return this.db.lead.findMany({ where: { clienteId }, include: { evento: true } });
  }

  listarResumo(clienteId: string) {
    return this.db.lead.findMany({ where: { clienteId }, select: { id: true, empresaId: true, estagio: true, scorePrioridade: true } });
  }

  listarUltimos(clienteId: string, limite: number) {
    return this.db.lead.findMany({
      where: { clienteId },
      orderBy: { criadoEm: "desc" },
      take: limite,
      include: { empresa: true, evento: EVENTO_COM_TIPO, dono: DONO },
    });
  }

  buscarDoCliente(clienteId: string, id: string) {
    return this.db.lead.findFirst({ where: { id, clienteId } });
  }

  buscarPorEmpresa(clienteId: string, empresaId: string) {
    return this.db.lead.findUnique({ where: { clienteId_empresaId: { clienteId, empresaId } } });
  }

  /** Lead com o necessário para compor a abordagem (empresa, gatilho, dono, cliente). */
  buscarParaAbordagem(clienteId: string, id: string) {
    return this.db.lead.findFirst({
      where: { id, clienteId },
      include: { empresa: true, evento: EVENTO_COM_TIPO, dono: true, cliente: true },
    });
  }

  buscarParaAgendamento(clienteId: string, id: string) {
    return this.db.lead.findFirst({
      where: { id, clienteId },
      include: { empresa: true, mensagens: { where: { direcao: "ENTRADA" }, orderBy: { criadoEm: "desc" }, take: 1 } },
    });
  }

  buscarDetalhe(clienteId: string, id: string) {
    return this.db.lead.findFirst({
      where: { id, clienteId },
      include: {
        empresa: { include: { contatos: true, eventos: { include: { tipo: true }, orderBy: { detectadoEm: "desc" } } } },
        evento: EVENTO_COM_TIPO,
        dono: DONO,
        mensagens: { orderBy: { criadoEm: "asc" }, include: { contato: { select: { nome: true } } } },
        reunioes: { orderBy: { inicio: "desc" }, include: { vendedor: { select: { nome: true } } } },
        desfecho: true,
      },
    });
  }

  criar(dados: Prisma.LeadUncheckedCreateInput) {
    return this.db.lead.create({ data: dados });
  }

  atualizar(id: string, dados: Prisma.LeadUncheckedUpdateInput) {
    return this.db.lead.update({ where: { id }, data: dados });
  }

  async atualizarDono(clienteId: string, id: string, donoId: string) {
    const { count } = await this.db.lead.updateMany({ where: { id, clienteId }, data: { donoId } });
    return count;
  }

  /** Opt-out global: suprime os leads em aberto da empresa em TODOS os clientes. */
  suprimirAbertosDaEmpresa(empresaId: string) {
    return this.db.lead.updateMany({ where: { empresaId, estagio: { notIn: ESTAGIOS_FINAIS } }, data: { estagio: "SUPRIMIDO" } });
  }

  registrarDesfecho(leadId: string, resultado: ResultadoDesfecho, motivo?: string) {
    return this.db.desfecho.upsert({ where: { leadId }, create: { leadId, resultado, motivo }, update: { resultado, motivo } });
  }

  async contarPorEstagio(clienteId: string) {
    const grupos = await this.db.lead.groupBy({ by: ["estagio"], where: { clienteId }, _count: true });
    return new Map(grupos.map((g) => [g.estagio, g._count]));
  }

  contarComReuniaoRealizada(clienteId: string, estagio?: EstagioLead) {
    return this.db.lead.count({ where: { clienteId, ...(estagio ? { estagio } : {}), reunioes: { some: { status: "REALIZADA" } } } });
  }
}
