import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export class ClienteRepository {
  constructor(private readonly db: DbClient) {}

  buscarPorId(id: string) {
    return this.db.cliente.findUnique({ where: { id } });
  }

  buscarComIcp(id: string) {
    return this.db.cliente.findUnique({ where: { id }, include: { icp: true } });
  }

  listarIds() {
    return this.db.cliente.findMany({ select: { id: true } });
  }

  atualizar(id: string, dados: Prisma.ClienteUpdateInput) {
    return this.db.cliente.update({ where: { id }, data: dados });
  }
}
