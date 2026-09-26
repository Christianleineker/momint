import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { SupressaoService } from "./supressao.service.js";

const params = z.object({ id: z.string() });

export const contatosRoutes =
  (supressao: SupressaoService): FastifyPluginAsync =>
  async (app) => {
    app.post("/contatos/:id/optout", async (req) => {
      const { id } = params.parse(req.params);
      await supressao.registrarOptOut(req.user.clienteId, id);
      return { ok: true };
    });
  };
