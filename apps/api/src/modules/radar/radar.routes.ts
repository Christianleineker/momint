import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { RadarService } from "./radar.service.js";
import { exigirPapel } from "../../infra/http/autenticacao.js";

const eventoParams = z.object({ eventoId: z.string() });
const filaBody = z.object({ canal: z.enum(["EMAIL", "WHATSAPP"]).default("EMAIL") });

export const radarRoutes =
  (radar: RadarService): FastifyPluginAsync =>
  async (app) => {
    app.get("/radar", async (req) => radar.listar(req.user.clienteId));

    app.post("/radar/sincronizar", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) => {
      if (req.user.papel === "ADMIN") return radar.sincronizar();
      await radar.ingerirFontes();
      return radar.processarCliente(req.user.clienteId);
    });

    app.post("/radar/:eventoId/fila", async (req) => {
      const { eventoId } = eventoParams.parse(req.params);
      const { canal } = filaBody.parse(req.body ?? {});
      return radar.adicionarAFila(req.user.clienteId, eventoId, canal);
    });
  };
