import type { PrismaClient } from "@prisma/client";
import { criarRepositorios, type Repositorios } from "./repositories/index.js";

/**
 * Unidade de trabalho: executa um bloco com repositórios ligados à mesma
 * transação — tudo é confirmado junto ou nada é.
 */
export class UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  executar<T>(trabalho: (repos: Repositorios) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => trabalho(criarRepositorios(tx)));
  }
}
