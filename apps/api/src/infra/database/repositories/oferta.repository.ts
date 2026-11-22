import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export type DadosOferta = Omit<Prisma.OfertaClienteUncheckedCreateInput, "clienteId" | "atualizadoEm">;

/** O que o cliente vende (1:1 com Cliente). */
export class OfertaRepository {
  constructor(private readonly db: DbClient) {}

  buscarDoCliente(clienteId: string) {
    return this.db.ofertaCliente.findUnique({ where: { clienteId } });
  }

  salvarDoCliente(clienteId: string, dados: DadosOferta) {
    return this.db.ofertaCliente.upsert({ where: { clienteId }, create: { clienteId, ...dados }, update: dados });
  }
}
