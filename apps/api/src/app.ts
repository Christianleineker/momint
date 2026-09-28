import Fastify from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { Container } from "./container.js";
import { autenticar, COOKIE_SESSAO } from "./infra/http/autenticacao.js";
import { tratarErros } from "./infra/http/tratar-erros.js";
import { abordagemRoutes } from "./modules/abordagem/abordagem.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { cadenciaRoutes } from "./modules/cadencia/cadencia.routes.js";
import { configuracoesRoutes } from "./modules/configuracoes/configuracoes.routes.js";
import { contatosRoutes } from "./modules/contatos/contatos.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { icpRoutes } from "./modules/icp/icp.routes.js";
import { leadsRoutes } from "./modules/leads/leads.routes.js";
import { radarRoutes } from "./modules/radar/radar.routes.js";
import { reunioesRoutes } from "./modules/reunioes/reunioes.routes.js";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes.js";

export interface OpcoesApp {
  container: Container;
  jwtSecret: string;
  logger?: boolean;
}

export async function criarApp({ container: c, jwtSecret, logger = false }: OpcoesApp) {
  const app = Fastify({ logger });

  await app.register(cookie);
  await app.register(jwt, { secret: jwtSecret, cookie: { cookieName: COOKIE_SESSAO, signed: false } });
  app.setErrorHandler(tratarErros);

  app.get("/api/health", async () => ({ ok: true }));

  // Rotas públicas (login) + /auth/me com autenticação própria.
  await app.register(authRoutes(c.auth), { prefix: "/api" });

  // Rotas autenticadas: todas recebem a sessão (clienteId) via JWT.
  await app.register(
    async (privado) => {
      privado.addHook("onRequest", autenticar);
      await privado.register(dashboardRoutes(c.dashboard));
      await privado.register(radarRoutes(c.radar));
      await privado.register(leadsRoutes(c.leads));
      await privado.register(abordagemRoutes(c.abordagem));
      await privado.register(contatosRoutes(c.supressao));
      await privado.register(reunioesRoutes(c.reunioes));
      await privado.register(cadenciaRoutes(c.cadencia));
      await privado.register(icpRoutes(c.icp));
      await privado.register(configuracoesRoutes(c.configuracoes));
      await privado.register(usuariosRoutes(c.usuarios));
    },
    { prefix: "/api" },
  );

  return app;
}
