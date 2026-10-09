import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { autenticar, COOKIE_SESSAO } from "../../infra/http/autenticacao.js";
import type { AuthService } from "./auth.service.js";
import { createHash } from "node:crypto";

const loginBody = z.object({ email: z.string().email(), senha: z.string().min(1) });
const SETE_DIAS_S = 7 * 86_400;
const recuperacaoBody = z.object({ email: z.string().trim().toLowerCase().email() });
const tokenBody = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
const novaSenhaBody = tokenBody.extend({ senha: z.string().min(12).max(72).refine((senha) => Buffer.byteLength(senha, "utf8") <= 72) });

export const authRoutes =
  (auth: AuthService, secureCookie = false): FastifyPluginAsync =>
  async (app) => {
    const envios = new Set<Promise<void>>();
    function acompanhar(envio: Promise<void>) {
      const tarefa = envio.catch(() => { app.log.warn("Não foi possível enviar o e-mail de autenticação."); });
      envios.add(tarefa);
      void tarefa.finally(() => envios.delete(tarefa));
    }
    app.addHook("onClose", async () => { await Promise.allSettled(envios); });
    const limitarEmail = app.createRateLimit({ max: 3, timeWindow: "15 minutes", keyGenerator: (req) => {
      const { email } = recuperacaoBody.parse(req.body);
      return `recuperacao-email:${createHash("sha256").update(email).digest("hex")}`;
    } });
    app.post("/auth/login", async (req, rep) => {
      const { email, senha } = loginBody.parse(req.body);
      const { sessao, nome } = await auth.autenticar(email, senha);
      const token = app.jwt.sign(sessao, { expiresIn: SETE_DIAS_S });
      rep.setCookie(COOKIE_SESSAO, token, { path: "/", httpOnly: true, secure: secureCookie, sameSite: "lax", maxAge: SETE_DIAS_S });
      return { id: sessao.sub, nome, papel: sessao.papel };
    });

    app.post("/auth/logout", async (_req, rep) => {
      rep.clearCookie(COOKIE_SESSAO, { path: "/", secure: secureCookie, httpOnly: true, sameSite: "lax" });
      return { ok: true };
    });

    app.get("/auth/me", { onRequest: autenticar }, async (req) => auth.perfil(req.user.sub));

    app.post("/auth/recuperar-senha", {
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
      preHandler: async (req, rep) => {
        const limite = await limitarEmail(req);
        if (!limite.isAllowed && limite.isExceeded) {
          return rep.header("Retry-After", limite.ttlInSeconds).code(429).send({ erro: "Muitas solicitações. Aguarde alguns minutos.", codigo: "LIMITE_SOLICITACOES" });
        }
      },
    }, async (req, rep) => {
      const { email } = recuperacaoBody.parse(req.body);
      // Mesmo resultado e caminho HTTP para contas existentes ou desconhecidas.
      acompanhar(auth.solicitarRecuperacao(email));
      return rep.header("Cache-Control", "no-store").code(202).send({ mensagem: "Se o e-mail estiver associado a uma conta ativa, você receberá um link de recuperação." });
    });

    app.post("/auth/recuperacao/validar", { config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } }, async (req, rep) => {
      const { token } = tokenBody.parse(req.body);
      return rep.header("Cache-Control", "no-store").send({ valido: await auth.tokenValido(token) });
    });

    app.post("/auth/redefinir-senha", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (req, rep) => {
      const { token, senha } = novaSenhaBody.parse(req.body);
      const email = await auth.redefinirSenha(token, senha);
      acompanhar(auth.avisarAlteracao(email));
      rep.clearCookie(COOKIE_SESSAO, { path: "/", secure: secureCookie, httpOnly: true, sameSite: "lax" });
      return rep.header("Cache-Control", "no-store").send({ mensagem: "Senha alterada. Entre com sua nova senha." });
    });
  };
