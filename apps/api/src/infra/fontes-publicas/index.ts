import type { FontesPublicas } from "../../ports/fontes-publicas.js";
import { fontesHttp } from "./http.js";

/** Fontes públicas reais (CNPJ, PNCP e CNO). Os dublês de teste ficam em test/fixtures. */
export function criarFontesPublicas(): FontesPublicas {
  return fontesHttp;
}
