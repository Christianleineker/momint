import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { exigirPapel } from "../../infra/http/autenticacao.js";
import type { OfertaService } from "./oferta.service.js";

const texto = (rotulo: string, max: number) => z.string().trim().min(3, `Preencha: ${rotulo}`).max(max, `${rotulo}: no máximo ${max} caracteres`);

const ofertaBody = z.object({
  produto: texto("o que você vende, em poucas palavras", 60),
  descricao: texto("descrição da oferta", 800),
  proposta: texto("como você se apresenta", 240),
  beneficio: texto("por que agir agora", 240),
  compradores: texto("quem compra", 240),
  pauta: texto("foco da reunião", 240),
});

export const ofertaRoutes =
  (oferta: OfertaService): FastifyPluginAsync =>
  async (app) => {
    app.get("/oferta", async (req) => oferta.obter(req.user.clienteId));

    app.put("/oferta", { preHandler: exigirPapel("ADMIN", "GESTOR") }, async (req) => oferta.salvar(req.user.clienteId, ofertaBody.parse(req.body)));
  };
