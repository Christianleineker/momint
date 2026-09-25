// Lista global de supressão (opt-out): compartilhada entre TODOS os clientes.
import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

interface Identificacao {
  email: string | null;
  telefone: string | null;
}

export class SupressaoRepository {
  constructor(private readonly db: DbClient) {}

  async contem(contato: Identificacao): Promise<boolean> {
    const ou: Prisma.SupressaoWhereInput[] = [];
    if (contato.email) ou.push({ email: contato.email.toLowerCase() });
    if (contato.telefone) ou.push({ telefone: contato.telefone });
    if (!ou.length) return false;
    return (await this.db.supressao.count({ where: { OR: ou } })) > 0;
  }

  async registrar(contato: Identificacao, motivo: string) {
    if (contato.email) {
      const email = contato.email.toLowerCase();
      await this.db.supressao.upsert({ where: { email }, create: { email, motivo }, update: {} });
    }
    if (contato.telefone) {
      await this.db.supressao.upsert({ where: { telefone: contato.telefone }, create: { telefone: contato.telefone, motivo }, update: {} });
    }
  }
}
