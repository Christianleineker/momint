import type { FastifyPluginAsync } from "fastify";
import type { DashboardService } from "./dashboard.service.js";

export const dashboardRoutes =
  (dashboard: DashboardService): FastifyPluginAsync =>
  async (app) => {
    app.get("/dashboard", async (req) => dashboard.obter(req.user.clienteId));
  };
