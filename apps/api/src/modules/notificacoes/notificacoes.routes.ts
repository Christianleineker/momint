import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { NotificacoesService } from "./notificacoes.service.js";

const marcarBody = z.object({ chaves: z.array(z.string().min(1).max(120)).min(1).max(500) });

export const notificacoesRoutes =
  (notificacoes: NotificacoesService): FastifyPluginAsync =>
  async (app) => {
    app.get("/notificacoes/lidas", async (req) => ({ chaves: await notificacoes.lidas(req.user.sub) }));

    app.post("/notificacoes/lidas", async (req) => {
      await notificacoes.marcarLidas(req.user.sub, marcarBody.parse(req.body).chaves);
      return { ok: true };
    });
  };
