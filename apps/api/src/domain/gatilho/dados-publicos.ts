// Estrutura dos dados brutos das fontes públicas. Os gatilhos guardam estes
// formatos em `dadosBrutos`; os adapters de infraestrutura os produzem.

/** GET https://minhareceita.org/{cnpj} (recorte dos campos usados) */
export interface MinhaReceitaCnpj {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  porte: string; // "MICRO EMPRESA" | "EMPRESA DE PEQUENO PORTE" | "DEMAIS"
  descricao_situacao_cadastral: string; // "ATIVA" | "BAIXADA" | "INAPTA" | "SUSPENSA"
  data_inicio_atividade: string; // YYYY-MM-DD
  uf: string;
  municipio: string;
  bairro?: string | null;
  ddd_telefone_1?: string | null;
  email?: string | null;
  qsa: Array<{ nome_socio: string; qualificacao_socio: string }>;
}

/** GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao (item de data[]) */
export interface PncpContratacao {
  numeroControlePNCP: string;
  objetoCompra: string;
  orgaoEntidade: { cnpj: string; razaoSocial: string };
  unidadeOrgao: { municipioNome: string; ufSigla: string; nomeUnidade: string };
  modalidadeNome: string;
  valorTotalEstimado: number;
  dataPublicacaoPncp: string; // ISO
  /** Não vem no endpoint de publicação: no MVP, o CNPJ interessado/vencedor
   *  vem do cruzamento com resultados/propostas. Mantido explícito aqui. */
  cnpjInteressado: string;
}

/** CNO via Base dos Dados (BigQuery) — linha agregada */
export interface CnoObra {
  cno: string;
  situacao: string; // "ATIVA" | "PARALISADA" | "ENCERRADA"
  dataInicioObra: string; // YYYY-MM-DD
  dataRegistro: string; // quando apareceu na base (usado como detecção)
  uf: string;
  municipio: string;
  bairro: string;
  areas: Array<{ categoria: string; destinacao: string; metragem: number }>;
  niResponsavel: string; // CNPJ do responsável
}

export type CodigoGatilho = "CNO" | "PNCP" | "CNPJ_NOVO";
