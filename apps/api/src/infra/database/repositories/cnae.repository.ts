import type { DbClient } from "../prisma.js";

/** Catálogo de CNAEs oferecido na segmentação. Cresce com as atividades das
 *  empresas que o radar encontra nas fontes públicas. */
export class CnaeRepository {
  constructor(private readonly db: DbClient) {}

  listar() {
    return this.db.cnae.findMany({ orderBy: { codigo: "asc" } });
  }

  registrar(codigo: string, descricao: string) {
    return this.db.cnae.upsert({ where: { codigo }, create: { codigo, descricao }, update: {} });
  }
}
