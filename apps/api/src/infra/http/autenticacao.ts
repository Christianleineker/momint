import type { FastifyReply, FastifyRequest } from "fastify";
import { AcessoNegado, NaoAutenticado } from "../../shared/erros.js";
import type { Papel, Sessao } from "../../shared/sessao.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: Sessao;
    user: Sessao;
  }
}

export const COOKIE_SESSAO = "momint_token";

/** Hook onRequest: exige sessão válida (JWT no cookie). */
export async function autenticar(req: FastifyRequest) {
  try {
    await req.jwtVerify();
  } catch {
    throw new NaoAutenticado("Não autenticado");
  }
}

/** Hook preHandler: exige um dos papéis informados. */
export function exigirPapel(...papeis: Papel[]) {
  return async (req: FastifyRequest, _rep: FastifyReply) => {
    if (!papeis.includes(req.user.papel)) throw new AcessoNegado("Apenas administradores");
  };
}
