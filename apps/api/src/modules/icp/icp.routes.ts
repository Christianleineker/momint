import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { IcpService } from "./icp.service.js";

const icpBody = z
  .object({
    cnaes: z.array(z.string()).min(1),
    portes: z.array(z.enum(["MICRO EMPRESA", "EMPRESA DE PEQUENO PORTE", "DEMAIS"])).min(1),
    cidadeBase: z.string(),
    raioKm: z.number().int().min(1).max(500),
    idadeMinAnos: z.number().int().min(0),
    idadeMaxAnos: z.number().int().min(0),
    fontesAtivas: z.array(z.enum(["CNO", "PNCP", "CNPJ_NOVO"])),
  })
  .refine((v) => v.idadeMinAnos <= v.idadeMaxAnos, "Idade mínima maior que a máxima");

export const icpRoutes =
  (icp: IcpService): FastifyPluginAsync =>
  async (app) => {
    app.get("/icp", async (req) => icp.obter(req.user.clienteId));

    app.put("/icp", { preHandler: exigirPapel("ADMIN") }, async (req) => icp.salvar(req.user.clienteId, icpBody.parse(req.body)));
  };
