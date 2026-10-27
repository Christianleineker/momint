import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { AdminService } from "./admin.service.js";

const nome = z.string().trim().min(2).max(120);
const sistema = z.object({ nome, plano: z.string().trim().min(1).max(60).default("piloto"), responsavel: nome, email: z.string().trim().toLowerCase().email().max(254), senha: z.string().min(12).max(72).refine(s => Buffer.byteLength(s, "utf8") <= 72) });
const params = z.object({ id: z.string().min(1) });
export const adminRoutes = (admin: AdminService): FastifyPluginAsync => async app => {
  app.addHook("preHandler", exigirPapel("ADMIN"));
  app.addHook("onSend", async (_req, rep) => { rep.header("Cache-Control", "no-store"); });
  app.get("/admin/clientes", () => admin.listar());
  app.post("/admin/clientes", async (req, rep) => rep.code(201).send(await admin.criarCliente(z.object({ nome, documento: z.string().trim().max(40).optional(), sistema }).parse(req.body))));
  app.post("/admin/clientes/:id/sistemas", async (req, rep) => rep.code(201).send(await admin.criarSistema(params.parse(req.params).id, sistema.parse(req.body))));
  app.patch("/admin/sistemas/:id", async req => { await admin.alterarSistema(params.parse(req.params).id, z.object({ ativo: z.boolean() }).parse(req.body).ativo); return { ok: true }; });
  app.delete("/admin/clientes/:id", async req => { await admin.excluirCliente(params.parse(req.params).id, z.object({ confirmacao: z.string() }).parse(req.body).confirmacao); return { ok: true }; });
};
