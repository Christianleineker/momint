import type { DbClient } from "../prisma.js";

export class TentativaLoginRepository {
  constructor(private readonly db: DbClient) {}

  async bloquear(chave: string) {
    // A trava transacional também serializa tentativas da mesma conta em outras instâncias.
    await this.db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))::text`;
    return this.db.tentativaLogin.findUnique({ where: { chave } });
  }

  registrar(chave: string, tentativas: number, bloqueadoAte: Date | null) {
    return this.db.tentativaLogin.upsert({ where: { chave }, create: { chave, tentativas, bloqueadoAte }, update: { tentativas, bloqueadoAte } });
  }

  limpar(chave: string) {
    return this.db.tentativaLogin.deleteMany({ where: { chave } });
  }
}
