import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export class PerfilIcpRepository {
  constructor(private readonly db: DbClient) {}

  buscarDoCliente(clienteId: string) {
    return this.db.perfilICP.findUnique({ where: { clienteId } });
  }

  atualizarDoCliente(clienteId: string, dados: Prisma.PerfilICPUpdateInput) {
    return this.db.perfilICP.update({ where: { clienteId }, data: dados });
  }
}
