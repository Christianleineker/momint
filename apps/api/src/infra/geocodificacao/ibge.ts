// Geocodificação pela API pública do IBGE (localidades + malhas). Cada município
// consultado fica guardado na tabela Municipio, que funciona como cache.
import type { Coordenada, Geocodificador } from "../../ports/geocodificador.js";
import { normalizarMunicipio } from "../../shared/texto.js";
import type { DbClient } from "../database/prisma.js";

const IBGE = "https://servicodados.ibge.gov.br/api";
const TEMPO_LIMITE_MS = 15_000;

type MunicipioIbge = { id: number; nome: string };
type MetadadosMalha = { centroide?: { latitude: number; longitude: number } };

async function lerJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
  return (await res.json()) as T;
}

export class GeocodificadorIbge implements Geocodificador {
  /** Código IBGE de cada município, por UF (uma consulta por UF). */
  private readonly codigos = new Map<string, Promise<Map<string, number>>>();

  constructor(private readonly db: DbClient) {}

  async coordenadas(municipio: string, uf: string): Promise<Coordenada | null> {
    const chave = { nome: normalizarMunicipio(municipio), uf: uf.toUpperCase() };
    const salvo = await this.db.municipio.findUnique({ where: { nome_uf: chave } });
    if (salvo) return [salvo.lat, salvo.lng];
    try {
      const codigo = (await this.codigosDaUf(chave.uf)).get(chave.nome);
      if (!codigo) return null;
      const [malha] = await lerJson<MetadadosMalha[]>(`${IBGE}/v3/malhas/municipios/${codigo}/metadados`);
      if (!malha?.centroide) return null;
      const { latitude: lat, longitude: lng } = malha.centroide;
      await this.db.municipio.upsert({ where: { nome_uf: chave }, create: { ...chave, lat, lng }, update: { lat, lng } });
      return [lat, lng];
    } catch {
      return null; // IBGE fora do ar: a empresa fica sem distância até a próxima sincronização
    }
  }

  async municipios(uf: string) {
    const sigla = uf.toUpperCase();
    try {
      return [...(await this.codigosDaUf(sigla)).keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));
    } catch {
      const salvos = await this.db.municipio.findMany({ where: { uf: sigla }, select: { nome: true }, orderBy: { nome: "asc" } });
      return salvos.map((m) => m.nome);
    }
  }

  private codigosDaUf(uf: string) {
    let codigos = this.codigos.get(uf);
    if (!codigos) {
      codigos = lerJson<MunicipioIbge[]>(`${IBGE}/v1/localidades/estados/${uf}/municipios`).then(
        (lista) => new Map(lista.map((m) => [normalizarMunicipio(m.nome), m.id])),
      );
      codigos.catch(() => this.codigos.delete(uf)); // falhou: tenta de novo na próxima chamada
      this.codigos.set(uf, codigos);
    }
    return codigos;
  }
}
