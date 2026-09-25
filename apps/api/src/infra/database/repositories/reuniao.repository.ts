import type { Prisma, StatusReuniao } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export class ReuniaoRepository {
  constructor(private readonly db: DbClient) {}

  criar(dados: Prisma.ReuniaoUncheckedCreateInput) {
    return this.db.reuniao.create({ data: dados });
  }

  listarDoCliente(clienteId: string) {
    return this.db.reuniao.findMany({
      where: { lead: { clienteId } },
      include: { lead: { include: { empresa: true, evento: { include: { tipo: true } } } }, vendedor: { select: { nome: true } } },
      orderBy: { inicio: "desc" },
    });
  }

  buscarDoCliente(clienteId: string, id: string) {
    return this.db.reuniao.findFirst({ where: { id, lead: { clienteId } }, include: { lead: true } });
  }

  atualizarStatus(id: string, status: StatusReuniao) {
    return this.db.reuniao.update({ where: { id }, data: { status } });
  }

  marcarAgendadasComoRealizadas(leadId: string) {
    return this.db.reuniao.updateMany({ where: { leadId, status: "AGENDADA" }, data: { status: "REALIZADA" } });
  }

  contarCriadasDesde(clienteId: string, desde: Date) {
    return this.db.reuniao.count({ where: { lead: { clienteId }, criadoEm: { gte: desde } } });
  }

  listarInicioDesde(clienteId: string, desde: Date) {
    return this.db.reuniao.findMany({ where: { lead: { clienteId }, inicio: { gte: desde } }, select: { inicio: true, status: true } });
  }
}
