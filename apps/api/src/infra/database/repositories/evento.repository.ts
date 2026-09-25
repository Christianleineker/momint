import type { CodigoGatilho, Prisma, TipoDeGatilho } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export interface NovoEvento {
  externalId: string;
  empresaId: string;
  tipoId: string;
  detectadoEm: Date;
  resumo: string;
  dadosBrutos: Prisma.InputJsonValue;
}

export class EventoRepository {
  constructor(private readonly db: DbClient) {}

  /** Idempotente: um mesmo evento da fonte (externalId) é registrado uma única vez. */
  registrar(ev: NovoEvento) {
    return this.db.eventoDeGatilho.upsert({ where: { externalId: ev.externalId }, create: ev, update: {} });
  }

  buscarPorId(id: string) {
    return this.db.eventoDeGatilho.findUnique({ where: { id } });
  }

  listarComEmpresa() {
    return this.db.eventoDeGatilho.findMany({ include: { empresa: true, tipo: true }, orderBy: { detectadoEm: "desc" } });
  }

  listarDasEmpresas(empresaIds: string[]) {
    return this.db.eventoDeGatilho.findMany({ where: { empresaId: { in: empresaIds } }, include: { tipo: true } });
  }

  listarDaEmpresa(empresaId: string) {
    return this.db.eventoDeGatilho.findMany({ where: { empresaId }, include: { tipo: true }, orderBy: { detectadoEm: "desc" } });
  }

  async tiposPorCodigo(): Promise<Record<CodigoGatilho, TipoDeGatilho>> {
    const tipos = await this.db.tipoDeGatilho.findMany();
    return Object.fromEntries(tipos.map((t) => [t.codigo, t])) as Record<CodigoGatilho, TipoDeGatilho>;
  }
}
