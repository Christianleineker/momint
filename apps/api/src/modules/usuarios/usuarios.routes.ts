import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { UsuariosService } from "./usuarios.service.js";

const papel = z.enum(["ADMIN", "VENDEDOR"]);
const novoUsuarioBody = z.object({ nome: z.string().min(2), email: z.string().email(), senha: z.string().min(6), papel });
const atualizacaoBody = z.object({ ativo: z.boolean().optional(), papel: papel.optional() });
const idParams = z.object({ id: z.string() });

export const usuariosRoutes =
  (usuarios: UsuariosService): FastifyPluginAsync =>
  async (app) => {
    app.get("/vendedores", async (req) => usuarios.listarAtivos(req.user.clienteId));

    app.post("/usuarios", { preHandler: exigirPapel("ADMIN") }, async (req) => usuarios.criar(req.user.clienteId, novoUsuarioBody.parse(req.body)));

    app.patch("/usuarios/:id", { preHandler: exigirPapel("ADMIN") }, async (req) => {
      const { id } = idParams.parse(req.params);
      await usuarios.atualizar(req.user.clienteId, req.user.sub, id, atualizacaoBody.parse(req.body));
      return { ok: true };
    });
  };
