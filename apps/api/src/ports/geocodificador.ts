export type Coordenada = [lat: number, lng: number];

export interface Geocodificador {
  /** Coordenada aproximada do município (centro), ou null se desconhecido. */
  coordenadas(municipio: string): Coordenada | null;
  municipiosConhecidos(): string[];
}
