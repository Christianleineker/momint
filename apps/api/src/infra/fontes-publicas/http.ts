// Fontes públicas "ao vivo" — esqueleto para a fase pós-MVP.
// minhareceita e PNCP são públicos e sem autenticação; CNO exige BigQuery
// (Base dos Dados) e fica como TODO explícito.
import type { MinhaReceitaCnpj, PncpContratacao } from "../../domain/gatilho/dados-publicos.js";
import type { FonteCno, FonteCnpj, FontePncp, FontesPublicas } from "../../ports/fontes-publicas.js";

const cnpjHttp: FonteCnpj = {
  async buscar(cnpj) {
    const res = await fetch(`https://minhareceita.org/${cnpj.replace(/\D/g, "")}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`minhareceita ${res.status}`);
    return (await res.json()) as MinhaReceitaCnpj;
  },
  async novasEmpresas() {
    throw new Error("Varredura de CNPJs novos requer o dump da Receita (não disponível via API pública)");
  },
};

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

const pncpHttp: FontePncp = {
  async contratacoesPublicadas(desde, ate) {
    const url = new URL("https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao");
    url.searchParams.set("dataInicial", ymd(desde));
    url.searchParams.set("dataFinal", ymd(ate));
    url.searchParams.set("codigoModalidadeContratacao", "4"); // concorrência eletrônica
    url.searchParams.set("uf", "PR");
    url.searchParams.set("pagina", "1");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PNCP ${res.status}`);
    const body = (await res.json()) as { data: Omit<PncpContratacao, "cnpjInteressado">[] };
    // TODO: cruzar com /resultados para descobrir o CNPJ interessado/vencedor.
    return body.data.map((d) => ({ ...d, cnpjInteressado: "" }));
  },
};

const cnoHttp: FonteCno = {
  async obrasRegistradas() {
    throw new Error("CNO ao vivo requer credenciais do BigQuery (Base dos Dados) — use DATA_MODE=mock");
  },
};

export const fontesHttp: FontesPublicas = { cnpj: cnpjHttp, pncp: pncpHttp, cno: cnoHttp };
