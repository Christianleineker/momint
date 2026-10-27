import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ErroAplicacao } from "../../shared/erros.js";

/** Tradução centralizada de erros → resposta HTTP { erro, codigo }. */
export function tratarErros(err: FastifyError, req: FastifyRequest, rep: FastifyReply) {
  if (err instanceof ErroAplicacao) {
    return rep.code(err.status).send({ erro: err.message, codigo: err.codigo });
  }
  if (err instanceof ZodError) {
    return rep.code(400).send({ erro: "Dados inválidos", codigo: "ENTRADA_INVALIDA", detalhes: err.issues });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return rep.code(409).send({ erro: "Já existe um cadastro com esses dados.", codigo: "CONFLITO" });
  }
  // Erros do próprio Fastify (JSON malformado, payload grande etc.).
  if (err.statusCode && err.statusCode < 500) {
    return rep.code(err.statusCode).send({ erro: err.message, codigo: err.code ?? "REQUISICAO_INVALIDA" });
  }
  req.log.error(err);
  return rep.code(500).send({ erro: "Erro interno", codigo: "ERRO_INTERNO" });
}
