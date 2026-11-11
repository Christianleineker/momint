import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";
import type { Sessao } from "../../../shared/sessao.js";
import { EMAIL_ADMIN } from "../../../shared/admin.js";

const RESUMO = { id: true, nome: true, email: true, papel: true, ativo: true } as const;

export class UsuarioRepository {
  constructor(private readonly db: DbClient) {}

  buscarPorEmail(email: string) {
    return this.db.usuario.findUnique({ where: { email: email.trim().toLowerCase() }, include: { cliente: { include: { contaCliente: true } } } });
  }

  buscarComCliente(id: string) {
    return this.db.usuario.findUnique({ where: { id }, include: { cliente: { include: { contaCliente: true } } } });
  }

  validarSessao(sessao: Sessao) {
    return this.db.usuario.findFirst({
      where: {
        id: sessao.sub, clienteId: sessao.clienteId, papel: sessao.papel, versaoSessao: sessao.versao ?? 0, ativo: true,
        ...(sessao.papel === "ADMIN" ? { email: EMAIL_ADMIN } : {}),
        cliente: { ativo: true, OR: [{ contaClienteId: null }, { contaCliente: { excluidoEm: null } }] },
      },
      select: { id: true },
    });
  }

  bloquearSenha(id: string) {
    return this.db.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${id} FOR UPDATE`;
  }

  historicoSenhas(usuarioId: string) {
    return this.db.historicoSenha.findMany({ where: { usuarioId }, select: { senhaHash: true } });
  }

  buscarDoCliente(clienteId: string, id: string) {
    return this.db.usuario.findFirst({ where: { id, clienteId } });
  }

  listarDoCliente(clienteId: string) {
    return this.db.usuario.findMany({ where: { clienteId }, select: RESUMO, orderBy: { criadoEm: "asc" } });
  }

  listarAtivos(clienteId: string) {
    return this.db.usuario.findMany({ where: { clienteId, ativo: true }, select: { id: true, nome: true, papel: true }, orderBy: { criadoEm: "asc" } });
  }

  listarVendedoresAtivos(clienteId: string) {
    return this.db.usuario.findMany({ where: { clienteId, papel: "VENDEDOR", ativo: true }, orderBy: { criadoEm: "asc" } });
  }

  criar(dados: Prisma.UsuarioUncheckedCreateInput) {
    return this.db.usuario.create({ data: dados, select: RESUMO });
  }

  async redefinirSenha(id: string, senhaHash: string) {
    await this.db.desafioEmail.deleteMany({ where: { usuarioId: id } });
    return this.db.usuario.update({ where: { id }, data: { senhaHash, primeiroAcessoPendente: false, versaoSessao: { increment: 1 } } });
  }

  atualizarPerfil(id: string, versaoSessao: number, dados: Prisma.UsuarioUpdateManyMutationInput) {
    return this.db.usuario.updateMany({ where: { id, versaoSessao, ativo: true }, data: dados });
  }

  /** Atualiza só se o usuário pertencer ao cliente; retorna quantos foram alterados. */
  async atualizarDoCliente(clienteId: string, id: string, dados: Prisma.UsuarioUpdateManyMutationInput) {
    const { count } = await this.db.usuario.updateMany({ where: { id, clienteId }, data: dados });
    return count;
  }
}
