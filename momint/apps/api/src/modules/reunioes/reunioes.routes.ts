import type { FastifyPluginAsync } from "fastify";
import type { ReunioesService } from "./reunioes.service.js";
import { agendarBody, idParams, statusReuniaoBody } from "./reunioes.schemas.js";

export const reunioesRoutes =
  (reunioes: ReunioesService): FastifyPluginAsync =>
  async (app) => {
    app.get("/reunioes", async (req) => reunioes.listar(req.user.clienteId));

    app.post("/leads/:id/reunioes", async (req) => {
      const { id } = idParams.parse(req.params);
      const { inicio, duracaoMin } = agendarBody.parse(req.body);
      return reunioes.agendar(req.user.clienteId, id, { inicio, duracaoMin, vendedorId: req.user.sub });
    });

    app.patch("/reunioes/:id", async (req) => {
      const { id } = idParams.parse(req.params);
      await reunioes.atualizarStatus(req.user.clienteId, id, statusReuniaoBody.parse(req.body).status);
      return { ok: true };
    });
  };
