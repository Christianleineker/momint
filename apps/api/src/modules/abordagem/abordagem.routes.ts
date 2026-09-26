import type { FastifyPluginAsync } from "fastify";
import type { AbordagemService } from "./abordagem.service.js";
import { abordarBody, edicaoMensagemBody, idParams, respostaBody } from "./abordagem.schemas.js";

export const abordagemRoutes =
  (abordagem: AbordagemService): FastifyPluginAsync =>
  async (app) => {
    app.get("/abordagens/fila", async (req) => abordagem.listarFila(req.user.clienteId));

    app.post("/leads/:id/abordar", async (req) => {
      const { id } = idParams.parse(req.params);
      const { canal } = abordarBody.parse(req.body ?? {});
      return abordagem.abordar(req.user.clienteId, id, canal);
    });

    app.post("/leads/:id/respostas", async (req) => {
      const { id } = idParams.parse(req.params);
      return abordagem.registrarResposta(req.user.clienteId, id, respostaBody.parse(req.body));
    });

    app.put("/mensagens/:id", async (req) => {
      const { id } = idParams.parse(req.params);
      return abordagem.editarRascunho(req.user.clienteId, id, edicaoMensagemBody.parse(req.body));
    });

    app.post("/mensagens/:id/aprovar", async (req) => {
      const { id } = idParams.parse(req.params);
      const temEdicao = req.body && Object.keys(req.body as object).length > 0;
      return abordagem.aprovar(req.user.clienteId, req.user.sub, id, temEdicao ? edicaoMensagemBody.parse(req.body) : undefined);
    });

    app.post("/mensagens/:id/rejeitar", async (req) => {
      const { id } = idParams.parse(req.params);
      await abordagem.rejeitar(req.user.clienteId, id);
      return { ok: true };
    });
  };
