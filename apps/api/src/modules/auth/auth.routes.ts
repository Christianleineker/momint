import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { autenticar, COOKIE_SESSAO } from "../../infra/http/autenticacao.js";
import type { AuthService } from "./auth.service.js";

const loginBody = z.object({ email: z.string().email(), senha: z.string().min(1) });
const SETE_DIAS_S = 7 * 86_400;

export const authRoutes =
  (auth: AuthService): FastifyPluginAsync =>
  async (app) => {
    app.post("/auth/login", async (req, rep) => {
      const { email, senha } = loginBody.parse(req.body);
      const { sessao, nome } = await auth.autenticar(email, senha);
      const token = app.jwt.sign(sessao, { expiresIn: SETE_DIAS_S });
      rep.setCookie(COOKIE_SESSAO, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: SETE_DIAS_S });
      return { id: sessao.sub, nome, papel: sessao.papel };
    });

    app.post("/auth/logout", async (_req, rep) => {
      rep.clearCookie(COOKIE_SESSAO, { path: "/" });
      return { ok: true };
    });

    app.get("/auth/me", { onRequest: autenticar }, async (req) => auth.perfil(req.user.sub));
  };
