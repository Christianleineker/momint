import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { SuporteService } from "./suporte.service.js";

const COOKIE = "momint_suporte";
const mensagem = z.object({ conteudo: z.string().trim().min(1).max(2000), idEnvio: z.string().uuid() }).strict();
const params = z.object({ id: z.string().min(1).max(100) });
const pagina = z.object({ antes: z.string().min(1).max(100).optional() }).strict();
const leitura = z.object({ ate: z.string().min(1).max(100) }).strict();

export const suportePublicoRoutes = (suporte: SuporteService, seguro: boolean): FastifyPluginAsync => async app => {
  app.addHook("onSend", async (_req, rep) => { rep.header("Cache-Control", "no-store"); });
  app.get("/suporte/conversa", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async req => suporte.obterVisitante(req.cookies[COOKIE] ?? "", pagina.parse(req.query).antes));
  app.post("/suporte/conversa", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (req, rep) => {
    const dados = mensagem.extend({ nome: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email().max(254).optional(), assunto: z.enum(["SUPORTE", "COMERCIAL"]) }).strict().parse(req.body);
    const { token, conversa } = await suporte.iniciar(dados, req.cookies[COOKIE]);
    rep.setCookie(COOKIE, token, { path: "/api/suporte", httpOnly: true, secure: seguro, sameSite: "lax", maxAge: 30 * 86_400 });
    return rep.code(201).send(conversa);
  });
  app.post("/suporte/mensagens", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async req => suporte.enviarVisitante(req.cookies[COOKIE] ?? "", mensagem.parse(req.body)));
  app.post("/suporte/lida", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async req => { await suporte.marcarVisitante(req.cookies[COOKIE] ?? "", leitura.parse(req.body).ate); return { ok: true }; });
};

export const suporteAdminRoutes = (suporte: SuporteService): FastifyPluginAsync => async app => {
  app.addHook("preHandler", exigirPapel("ADMIN"));
  app.addHook("onSend", async (_req, rep) => { rep.header("Cache-Control", "no-store"); });
  app.get("/admin/suporte", req => suporte.listar(z.object({ busca: z.string().trim().max(100).optional() }).strict().parse(req.query).busca));
  app.get("/admin/suporte/:id", async req => suporte.obter(params.parse(req.params).id, pagina.parse(req.query).antes));
  app.post("/admin/suporte/:id/mensagens", async req => suporte.responder(params.parse(req.params).id, req.user.sub, mensagem.parse(req.body)));
  app.post("/admin/suporte/:id/lida", async req => { await suporte.marcarLida(params.parse(req.params).id, leitura.parse(req.body).ate, "ADMIN"); return { ok: true }; });
  app.patch("/admin/suporte/:id", async req => { await suporte.encerrar(params.parse(req.params).id, z.object({ encerrada: z.boolean() }).strict().parse(req.body).encerrada); return { ok: true }; });
};
