import type { Canal } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export interface NovoPassoCadencia {
  ordem: number;
  dia: number;
  canal: Canal;
  titulo: string;
}

export class CadenciaRepository {
  constructor(private readonly db: DbClient) {}

  listarDoCliente(clienteId: string) {
    return this.db.passoCadencia.findMany({ where: { clienteId }, orderBy: { ordem: "asc" } });
  }

  /** Substitui todos os passos — chamar dentro de uma transação (UnitOfWork). */
  async substituir(clienteId: string, passos: NovoPassoCadencia[]) {
    await this.db.passoCadencia.deleteMany({ where: { clienteId } });
    await this.db.passoCadencia.createMany({ data: passos.map((p) => ({ ...p, clienteId })) });
  }
}
