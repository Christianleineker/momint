// Camada compartilhada entre clientes: cache de dado público (EmpresaAlvo) e contatos.
import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export type DadosEmpresa = Omit<Prisma.EmpresaAlvoCreateInput, "cnpj" | "eventos" | "contatos" | "leads">;

export class EmpresaRepository {
  constructor(private readonly db: DbClient) {}

  upsertPorCnpj(cnpj: string, dados: DadosEmpresa) {
    return this.db.empresaAlvo.upsert({ where: { cnpj }, create: { cnpj, ...dados }, update: dados });
  }

  buscarPorCnpj(cnpj: string) {
    return this.db.empresaAlvo.findUnique({ where: { cnpj } });
  }

  listarComEventos() {
    return this.db.empresaAlvo.findMany({ include: { eventos: { include: { tipo: true } } } });
  }

  listarContatos(empresaId: string) {
    return this.db.contato.findMany({ where: { empresaId }, orderBy: { id: "asc" } });
  }

  primeiroContato(empresaId: string) {
    return this.db.contato.findFirst({ where: { empresaId }, orderBy: { id: "asc" } });
  }

  /** Contato visível ao cliente: só se o cliente tiver lead na empresa dele. */
  buscarContatoAcessivel(clienteId: string, id: string) {
    return this.db.contato.findFirst({ where: { id, empresa: { leads: { some: { clienteId } } } } });
  }

  criarContato(dados: Prisma.ContatoUncheckedCreateInput) {
    return this.db.contato.create({ data: dados });
  }
}
