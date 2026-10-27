import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { UsuariosService } from "./usuarios.service.js";

const papel = z.enum(["GESTOR", "VENDEDOR", "ATENDENTE"]);
const novoUsuarioBody = z.object({ nome: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email(), senha: z.string().min(12).max(72).refine(s => Buffer.byteLength(s, "utf8") <= 72), papel });
const atualizacaoBody = z.object({ ativo: z.boolean().optional(), papel: papel.optional() });
const idParams = z.object({ id: z.string() });

export const usuariosRoutes =
  (usuarios: UsuariosService): FastifyPluginAsync =>
  async (app) => {
    app.get("/vendedores", async (req) => usuarios.listarAtivos(req.user.clienteId));

    app.post("/usuarios", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) => usuarios.criar(req.user.clienteId, novoUsuarioBody.parse(req.body)));

    app.patch("/usuarios/:id", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) => {
      const { id } = idParams.parse(req.params);
      await usuarios.atualizar(req.user.clienteId, req.user.sub, id, atualizacaoBody.parse(req.body));
      return { ok: true };
    });
  };
