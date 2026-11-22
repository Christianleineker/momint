import type { DbClient } from "../prisma.js";

/** Notificações do painel já marcadas como lidas por cada usuário. */
export class LeituraNotificacaoRepository {
  constructor(private readonly db: DbClient) {}

  async listarChaves(usuarioId: string) {
    const leituras = await this.db.leituraNotificacao.findMany({ where: { usuarioId }, select: { chave: true } });
    return leituras.map((l) => l.chave);
  }

  async marcar(usuarioId: string, chaves: string[]) {
    await this.db.leituraNotificacao.createMany({ data: chaves.map((chave) => ({ usuarioId, chave })), skipDuplicates: true });
  }
}
