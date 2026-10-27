import type { DbClient } from "../prisma.js";

export class RecuperacaoSenhaRepository {
  constructor(private readonly db: DbClient) {}

  emitir(usuarioId: string, tokenHash: string, expiraEm: Date) {
    const dados = { tokenHash, expiraEm, usadaEm: null };
    return this.db.recuperacaoSenha.upsert({ where: { usuarioId }, create: { usuarioId, ...dados }, update: dados });
  }

  buscar(tokenHash: string) {
    return this.db.recuperacaoSenha.findUnique({ where: { tokenHash }, include: { usuario: { include: { cliente: { include: { contaCliente: true } } } } } });
  }

  async consumir(tokenHash: string, agora: Date) {
    const { count } = await this.db.recuperacaoSenha.updateMany({
      where: { tokenHash, usadaEm: null, expiraEm: { gt: agora }, usuario: { ativo: true, cliente: { ativo: true, OR: [{ contaClienteId: null }, { contaCliente: { excluidoEm: null } }] } } },
      data: { usadaEm: agora },
    });
    return count === 1;
  }
}
