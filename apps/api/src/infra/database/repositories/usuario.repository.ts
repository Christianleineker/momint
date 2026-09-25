import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

const RESUMO = { id: true, nome: true, email: true, papel: true, ativo: true } as const;

export class UsuarioRepository {
  constructor(private readonly db: DbClient) {}

  buscarPorEmail(email: string) {
    return this.db.usuario.findUnique({ where: { email: email.toLowerCase() } });
  }

  buscarComCliente(id: string) {
    return this.db.usuario.findUnique({ where: { id }, include: { cliente: true } });
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

  /** Atualiza só se o usuário pertencer ao cliente; retorna quantos foram alterados. */
  async atualizarDoCliente(clienteId: string, id: string, dados: Prisma.UsuarioUpdateManyMutationInput) {
    const { count } = await this.db.usuario.updateMany({ where: { id, clienteId }, data: dados });
    return count;
  }
}
