// Geocodificação mock: centro aproximado dos municípios de Curitiba e região.
import type { Coordenada, Geocodificador } from "../../ports/geocodificador.js";
import { normalizarMunicipio } from "../../shared/texto.js";

const COORDENADAS: Record<string, Coordenada> = {
  CURITIBA: [-25.4284, -49.2733],
  "SAO JOSE DOS PINHAIS": [-25.5347, -49.2064],
  COLOMBO: [-25.2917, -49.2242],
  PINHAIS: [-25.4447, -49.1925],
  ARAUCARIA: [-25.5926, -49.4103],
  PARANAGUA: [-25.5163, -48.5225],
  "CAMPO LARGO": [-25.459, -49.528],
  "ALMIRANTE TAMANDARE": [-25.325, -49.31],
  "FAZENDA RIO GRANDE": [-25.662, -49.307],
};

export const geocodificadorMunicipios: Geocodificador = {
  coordenadas: (municipio) => COORDENADAS[normalizarMunicipio(municipio)] ?? null,
  municipiosConhecidos: () => Object.keys(COORDENADAS),
};
