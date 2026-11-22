// Camada compartilhada entre clientes: cache de dado público (EmpresaAlvo) e contatos.
import type { Prisma } from "@prisma/client";
import type { DbClient } from "../prisma.js";

export type DadosEmpresa = Omit<Prisma.EmpresaAlvoCreateInput, "cnpj" | "eventos" | "contatos" | "leads">;

/** MANUAL vem depois de RECEITA_FEDERAL no enum: ordem decrescente põe o contato do time primeiro. */
const PREFERENCIA_DE_CONTATO: Prisma.ContatoOrderByWithRelationInput[] = [{ origem: "desc" }, { id: "asc" }];

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

  /** Contatos cadastrados pelo time vêm antes dos tirados do QSA público. */
  listarContatos(empresaId: string) {
    return this.db.contato.findMany({ where: { empresaId }, orderBy: PREFERENCIA_DE_CONTATO });
  }

  primeiroContato(empresaId: string) {
    return this.db.contato.findFirst({ where: { empresaId }, orderBy: PREFERENCIA_DE_CONTATO });
  }

  /** Contato visível ao cliente: só se o cliente tiver lead na empresa dele. */
  buscarContatoAcessivel(clienteId: string, id: string) {
    return this.db.contato.findFirst({ where: { id, empresa: { leads: { some: { clienteId } } } } });
  }

  criarContato(dados: Prisma.ContatoUncheckedCreateInput) {
    return this.db.contato.create({ data: dados });
  }
}
