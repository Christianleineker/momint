import type { FontesPublicas } from "../../ports/fontes-publicas.js";
import { fontesHttp } from "./http.js";
import { fontesMock } from "./mock.js";

export function criarFontesPublicas(modo: "mock" | "live"): FontesPublicas {
  return modo === "live" ? fontesHttp : fontesMock;
}
