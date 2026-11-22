// Porta de saída para as fontes de dados públicos. Implementações em
// infra/fontes-publicas (HTTP ao vivo; o mock com fixtures fica só nos testes).
import type { CnoObra, MinhaReceitaCnpj, PncpContratacao } from "../domain/gatilho/dados-publicos.js";

export interface FonteCnpj {
  buscar(cnpj: string): Promise<MinhaReceitaCnpj | null>;
  /** Empresas abertas desde a data (varredura incremental da base CNPJ). */
  novasEmpresas(desde: Date): Promise<MinhaReceitaCnpj[]>;
}

export interface FontePncp {
  /** Licitações de obra com resultado no período, com o CNPJ vencedor em `cnpjInteressado`. */
  contratacoesPublicadas(desde: Date, ate: Date): Promise<PncpContratacao[]>;
}

export interface FonteCno {
  obrasRegistradas(desde: Date, uf: string): Promise<CnoObra[]>;
}

export interface FontesPublicas {
  cnpj: FonteCnpj;
  pncp: FontePncp;
  cno: FonteCno;
}
