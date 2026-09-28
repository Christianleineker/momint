import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { CadenciaService } from "./cadencia.service.js";

const cadenciaBody = z.object({
  modoOperacao: z.enum(["COPILOTO", "AUTOPILOT"]),
  condicoesParada: z.array(z.string()),
  passos: z
    .array(z.object({ dia: z.number().int().min(0).max(60), canal: z.enum(["EMAIL", "WHATSAPP"]), titulo: z.string().min(1) }))
    .min(1),
});

export const cadenciaRoutes =
  (cadencia: CadenciaService): FastifyPluginAsync =>
  async (app) => {
    app.get("/cadencia", async (req) => cadencia.obter(req.user.clienteId));

    app.put("/cadencia", { preHandler: exigirPapel("ADMIN") }, async (req) => {
      await cadencia.salvar(req.user.clienteId, cadenciaBody.parse(req.body));
      return { ok: true };
    });
  };
