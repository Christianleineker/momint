import { PrismaClient, type Prisma } from "@prisma/client";

/** Cliente Prisma ou cliente de transação — os repositórios aceitam ambos. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export function criarPrisma(url?: string): PrismaClient {
  return new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
}
