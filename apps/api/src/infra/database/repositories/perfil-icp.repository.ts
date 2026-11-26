import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export class PerfilIcpRepository {
  constructor(private readonly db: DbClient) {}

  buscarDoCliente(clienteId: string) {
    return this.db.perfilICP.findUnique({ where: { clienteId } });
  }

  atualizarDoCliente(clienteId: string, dados: Omit<Prisma.PerfilICPUncheckedCreateInput, "clienteId">) {
    return this.db.perfilICP.upsert({ where: { clienteId }, create: { clienteId, ...dados }, update: dados });
  }
}
