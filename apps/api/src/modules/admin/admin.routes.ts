import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { AdminService } from "./admin.service.js";

const nome = z.string().trim().min(2).max(120);
const sistema = z.object({ nome, plano: z.string().trim().min(1).max(60).default("piloto"), responsavel: nome, email: z.string().trim().toLowerCase().email().max(254), senha: z.string().min(12).max(72).refine(s => Buffer.byteLength(s, "utf8") <= 72) });
const params = z.object({ id: z.string().min(1) });
const senha = z.string().min(12).max(72).refine(s => Buffer.byteLength(s, "utf8") <= 72);
const email = z.string().trim().toLowerCase().email().max(254);
const telefone = z.string().trim().max(30).nullable().optional();
export const adminRoutes = (admin: AdminService): FastifyPluginAsync => async app => {
  app.addHook("preHandler", exigirPapel("ADMIN"));
  app.addHook("onSend", async (_req, rep) => { rep.header("Cache-Control", "no-store"); });
  app.get("/admin/clientes", () => admin.listar());
  app.get("/admin/notificacoes", () => admin.notificacoes());
  app.patch("/admin/notificacoes", async req => {
    const dados = z.union([z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }).strict(), z.object({ todas: z.literal(true) }).strict()]).parse(req.body);
    await admin.lerNotificacoes("ids" in dados ? dados.ids : undefined); return { ok: true };
  });
  app.post("/admin/clientes", async (req, rep) => rep.code(201).send(await admin.criarCliente(z.object({ nome, documento: z.string().trim().max(40).optional(), sistema }).parse(req.body))));
  app.post("/admin/clientes/:id/sistemas", async (req, rep) => rep.code(201).send(await admin.criarSistema(params.parse(req.params).id, sistema.parse(req.body))));
  app.patch("/admin/sistemas/:id", async req => { await admin.alterarSistema(params.parse(req.params).id, z.object({ ativo: z.boolean() }).parse(req.body).ativo); return { ok: true }; });
  app.put("/admin/clientes/:id", async req => { await admin.editarCliente(params.parse(req.params).id, z.object({ nome, emailContato: email.nullable().optional(), telefone }).strict().parse(req.body)); return { ok: true }; });
  app.put("/admin/sistemas/:id", async req => { await admin.editarSistema(params.parse(req.params).id, z.object({ nome, plano: z.string().trim().min(1).max(60) }).strict().parse(req.body)); return { ok: true }; });
  app.put("/admin/usuarios/:id", async req => { await admin.editarUsuario(params.parse(req.params).id, z.object({ nome, email, telefone, senha: senha.optional() }).strict().parse(req.body)); return { ok: true }; });
  app.post("/admin/clientes/:id/confirmar-exclusao", async req => admin.prepararExclusao(params.parse(req.params).id, z.object({ confirmacao: z.string() }).strict().parse(req.body).confirmacao, req.user.sub, req.user.versao ?? 0));
  app.delete("/admin/clientes/:id/confirmar-exclusao", async req => { await admin.cancelarExclusao(params.parse(req.params).id, req.user.sub); return { ok: true }; });
  app.delete("/admin/clientes/:id", async req => {
    const dados = z.object({ confirmacao: z.string(), token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(req.body);
    await admin.excluirCliente(params.parse(req.params).id, dados.confirmacao, dados.token, req.user.sub, req.user.versao ?? 0); return { ok: true };
  });
};
