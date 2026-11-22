import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { GatilhosService } from "./gatilhos.service.js";

const regraBody = z.object({
  nome: z.string().trim().min(1).max(100),
  descricao: z.string().trim().min(1).max(180),
  fonte: z.enum(["CNO", "PNCP", "CNPJ_NOVO"]),
  criterio: z.string().trim().min(1).max(300),
  responsavelId: z.string().min(1, "Escolha o responsável pelo gatilho"),
});
const situacaoBody = z.object({ ativo: z.boolean() });
const idParams = z.object({ id: z.string() });

export const gatilhosRoutes =
  (gatilhos: GatilhosService): FastifyPluginAsync =>
  async (app) => {
    app.get("/gatilhos", async (req) => gatilhos.listar(req.user.clienteId));

    app.post("/gatilhos", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) =>
      gatilhos.criar(req.user.clienteId, regraBody.parse(req.body)));

    app.put("/gatilhos/:id", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) =>
      gatilhos.atualizar(req.user.clienteId, idParams.parse(req.params).id, regraBody.parse(req.body)));

    app.patch("/gatilhos/:id/situacao", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) =>
      gatilhos.alterarSituacao(req.user.clienteId, idParams.parse(req.params).id, situacaoBody.parse(req.body).ativo));

    app.delete("/gatilhos/:id", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) => {
      await gatilhos.remover(req.user.clienteId, idParams.parse(req.params).id);
      return { ok: true };
    });
  };
