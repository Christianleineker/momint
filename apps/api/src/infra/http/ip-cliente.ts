// IP de quem fez a requisição, usado como chave dos limites de requisição.
// A API só recebe tráfego pelo proxy do Next (e, na Render, antes dele, pelo Cloudflare):
// req.ip seria sempre o do proxy e todos os usuários dividiriam o mesmo limite.
import type { FastifyRequest } from "fastify";

const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)?.split(",")[0]?.trim();

export function ipDoCliente(req: FastifyRequest): string {
  return primeiro(req.headers["cf-connecting-ip"]) || primeiro(req.headers["x-forwarded-for"]) || req.ip;
}
