// Fontes públicas reais. minhareceita (CNPJ) e PNCP são públicos e sem autenticação.
// O CNO exige credenciais do BigQuery (Base dos Dados) e a varredura de CNPJs novos
// exige o arquivo completo da Receita: as duas ficam indisponíveis até essa integração.
import type { MinhaReceitaCnpj, PncpContratacao } from "../../domain/gatilho/dados-publicos.js";
import type { FonteCno, FonteCnpj, FontePncp, FontesPublicas } from "../../ports/fontes-publicas.js";
import { emLotes } from "../../shared/lotes.js";

const TEMPO_LIMITE_MS = 20_000;
/** Licitações de obras e serviços de engenharia, o público do Momint. */
const OBJETO_DE_OBRA = /obra|constru|reforma|paviment|edifica|engenharia|impermeabiliz|ampliac|ampliaç/i;
/** Concorrência eletrônica (4) e presencial (5): as modalidades das obras públicas. */
const MODALIDADES_DE_OBRA = [4, 5];
const ITENS_POR_PAGINA = 50;
/** A API devolve as atualizações da mais antiga para a mais recente: o radar lê só
 *  as últimas páginas de cada modalidade, onde estão os resultados mais novos. */
const PAGINAS_RECENTES = 3;
/** Teto de consultas de resultado por sincronização, para não sobrecarregar a API pública. */
const LIMITE_RESULTADOS = 30;
const CONSULTAS_SIMULTANEAS = 3;
/** Respostas 429 (limite de requisições da API pública) são repetidas com espera crescente. */
const TENTATIVAS = 4;
const ESPERA_BASE_MS = 3_000;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function lerJson<T>(url: URL | string, origem: string): Promise<T | null> {
  for (let tentativa = 1; ; tentativa++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (res.status === 429 && tentativa < TENTATIVAS) {
      const pedida = Number(res.headers.get("retry-after"));
      await esperar(pedida > 0 ? Math.min(pedida, 30) * 1000 : ESPERA_BASE_MS * tentativa);
      continue;
    }
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) throw new Error(`${origem} respondeu ${res.status}`);
    const texto = await res.text();
    return texto ? (JSON.parse(texto) as T) : null;
  }
}

const cnpjHttp: FonteCnpj = {
  async buscar(cnpj) {
    return lerJson<MinhaReceitaCnpj>(`https://minhareceita.org/${cnpj.replace(/\D/g, "")}`, "minhareceita");
  },
  async novasEmpresas() {
    throw new Error("a varredura de CNPJs novos exige o arquivo completo da Receita (não há API pública)");
  },
};

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

type PncpAtualizacao = Omit<PncpContratacao, "cnpjInteressado" | "resultado"> & {
  anoCompra: number;
  sequencialCompra: number;
  valorTotalHomologado: number | null;
  dataAtualizacaoGlobal: string;
};
type PncpResultado = { niFornecedor?: string; tipoPessoa?: string; nomeRazaoSocialFornecedor?: string; valorTotalHomologado?: number | null; dataResultado?: string };
type PaginaPncp = { data?: PncpAtualizacao[]; totalPaginas?: number };

function urlAtualizacoes(desde: Date, ate: Date, modalidade: number, pagina: number) {
  const url = new URL("https://pncp.gov.br/api/consulta/v1/contratacoes/atualizacao");
  url.searchParams.set("dataInicial", ymd(desde));
  url.searchParams.set("dataFinal", ymd(ate));
  url.searchParams.set("codigoModalidadeContratacao", String(modalidade));
  url.searchParams.set("uf", "PR");
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", String(ITENS_POR_PAGINA));
  return url;
}

/** Contratações da modalidade atualizadas no período, só das páginas mais recentes.
 *  Uma página por vez: a API pública limita requisições em paralelo. */
async function atualizacoesRecentes(desde: Date, ate: Date, modalidade: number) {
  const primeira = await lerJson<PaginaPncp>(urlAtualizacoes(desde, ate, modalidade, 1), "PNCP");
  const total = primeira?.totalPaginas ?? 1;
  const contratacoes = [...(primeira?.data ?? [])];
  for (let pagina = total; pagina > Math.max(1, total - PAGINAS_RECENTES); pagina--) {
    contratacoes.push(...((await lerJson<PaginaPncp>(urlAtualizacoes(desde, ate, modalidade, pagina), "PNCP"))?.data ?? []));
  }
  return contratacoes;
}

/** Resultado homologado do 1º item: quem venceu (pessoa jurídica), quando e por quanto. */
async function resultado(c: PncpAtualizacao): Promise<PncpContratacao["resultado"] | null> {
  const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${c.orgaoEntidade.cnpj}/compras/${c.anoCompra}/${c.sequencialCompra}/itens/1/resultados`;
  try {
    const resposta = await lerJson<PncpResultado[] | PncpResultado>(url, "PNCP");
    const r = Array.isArray(resposta) ? resposta[0] : resposta;
    if (r?.tipoPessoa !== "PJ" || !r.niFornecedor || !r.dataResultado) return null;
    return {
      niFornecedor: r.niFornecedor,
      nomeRazaoSocialFornecedor: r.nomeRazaoSocialFornecedor ?? "",
      valorTotalHomologado: r.valorTotalHomologado ?? null,
      dataResultado: r.dataResultado.slice(0, 10),
    };
  } catch {
    return null; // resultado indisponível nesta licitação não interrompe a varredura
  }
}

const pncpHttp: FontePncp = {
  /** Licitações de obra do PR homologadas recentemente, já com a empresa vencedora. */
  async contratacoesPublicadas(desde, ate) {
    const atualizadas: PncpAtualizacao[] = [];
    for (const modalidade of MODALIDADES_DE_OBRA) atualizadas.push(...(await atualizacoesRecentes(desde, ate, modalidade)));
    const unicas = new Map<string, PncpAtualizacao>();
    for (const c of atualizadas) {
      if (c.valorTotalHomologado != null && OBJETO_DE_OBRA.test(c.objetoCompra)) unicas.set(c.numeroControlePNCP, c);
    }
    const maisRecentes = [...unicas.values()]
      .sort((a, b) => b.dataAtualizacaoGlobal.localeCompare(a.dataAtualizacaoGlobal))
      .slice(0, LIMITE_RESULTADOS);

    const resultados = await emLotes(maisRecentes, CONSULTAS_SIMULTANEAS, resultado);
    return maisRecentes.flatMap((c, i) => {
      const r = resultados[i];
      if (!r) return [];
      const licitacao: PncpContratacao = {
        numeroControlePNCP: c.numeroControlePNCP,
        objetoCompra: c.objetoCompra,
        orgaoEntidade: { cnpj: c.orgaoEntidade.cnpj, razaoSocial: c.orgaoEntidade.razaoSocial },
        unidadeOrgao: { municipioNome: c.unidadeOrgao.municipioNome, ufSigla: c.unidadeOrgao.ufSigla, nomeUnidade: c.unidadeOrgao.nomeUnidade },
        modalidadeNome: c.modalidadeNome,
        valorTotalEstimado: c.valorTotalEstimado,
        dataPublicacaoPncp: c.dataPublicacaoPncp,
        cnpjInteressado: r.niFornecedor,
        resultado: r,
      };
      return [licitacao];
    });
  },
};

const cnoHttp: FonteCno = {
  async obrasRegistradas() {
    throw new Error("o CNO exige credenciais do BigQuery (Base dos Dados)");
  },
};

export const fontesHttp: FontesPublicas = { cnpj: cnpjHttp, pncp: pncpHttp, cno: cnoHttp };
