import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { ConfiguracoesService } from "./configuracoes.service.js";

const configuracoesBody = z.object({
  vozMarca: z.enum(["consultivo", "direto", "proximo"]),
  assinaturaEmail: z.string().nullable(),
  modoOperacao: z.enum(["COPILOTO", "AUTOPILOT"]),
  calendarioProvedor: z.enum(["google", "outlook"]).nullable(),
  calendarioConectado: z.boolean(),
});

export const configuracoesRoutes =
  (configuracoes: ConfiguracoesService): FastifyPluginAsync =>
  async (app) => {
    app.get("/configuracoes", async (req) => configuracoes.obter(req.user.clienteId));

    app.put("/configuracoes", { preHandler: exigirPapel("ADMIN") }, async (req) => {
      await configuracoes.salvar(req.user.clienteId, configuracoesBody.parse(req.body));
      return { ok: true };
    });
  };
