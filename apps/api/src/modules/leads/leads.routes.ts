import type { FastifyPluginAsync } from "fastify";
import type { LeadsService } from "./leads.service.js";
import { donoBody, idParams, moverEstagioBody, qualificacaoBody } from "./leads.schemas.js";

export const leadsRoutes =
  (leads: LeadsService): FastifyPluginAsync =>
  async (app) => {
    app.get("/leads", async (req) => leads.listar(req.user.clienteId));

    app.get("/leads/:id", async (req) => {
      const { id } = idParams.parse(req.params);
      return leads.detalhar(req.user.clienteId, id);
    });

    app.patch("/leads/:id/estagio", async (req) => {
      const { id } = idParams.parse(req.params);
      const { estagio, motivo } = moverEstagioBody.parse(req.body);
      return leads.moverEstagio(req.user.clienteId, id, estagio, motivo);
    });

    app.patch("/leads/:id/qualificacao", async (req) => {
      const { id } = idParams.parse(req.params);
      return leads.atualizarQualificacao(req.user.clienteId, id, qualificacaoBody.parse(req.body));
    });

    app.patch("/leads/:id/dono", async (req) => {
      const { id } = idParams.parse(req.params);
      await leads.alterarDono(req.user.clienteId, id, donoBody.parse(req.body).donoId);
      return { ok: true };
    });
  };
