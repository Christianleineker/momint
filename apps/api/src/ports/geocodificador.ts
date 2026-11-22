export type Coordenada = [lat: number, lng: number];

/** Centro aproximado dos municípios, para medir a distância até a cidade-base do ICP. */
export interface Geocodificador {
  /** Coordenada do município na UF, ou null se ele não for encontrado. */
  coordenadas(municipio: string, uf: string): Promise<Coordenada | null>;
  /** Municípios da UF (nome normalizado), para escolher a cidade-base do ICP. */
  municipios(uf: string): Promise<string[]>;
}
