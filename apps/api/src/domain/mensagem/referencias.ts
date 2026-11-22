// Contexto do gatilho numa mensagem (regra 5): toda 1ª abordagem precisa citar
// o evento específico que motivou o contato.
import type { CnoObra, CodigoGatilho, PncpContratacao } from "../gatilho/dados-publicos.js";
import { fmtData, fmtMoeda, fmtNumero, normalizar, titulo } from "./formatacao.js";

export interface ContextoGatilho {
  codigo: CodigoGatilho;
  detectadoEm: Date;
  dadosBrutos: unknown;
}

/** "CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA EXECUÇÃO DE OBRA DE X, CONFORME..." → "execução de obra de x" */
const PREAMBULO = /^contrata[çc][ãa]o\s+de\s+/iu;
const FIM_DO_PREAMBULO = /\s(para|visando)\s+(a\s+|o\s+)?/iu;
const LIMITE_OBJETO = 110;
const CONECTIVOS_NO_FIM = /(\s+(e|ou|a|o|as|os|ao|aos|à|às|de|da|do|das|dos|em|na|no|nas|nos|para|com|por|-|–))+$/iu;
/** Texto majoritariamente em maiúsculas ("execução da OBRA DE REVITALIZAÇÃO...") vira minúsculas. */
const emCaixaAlta = (t: string) => {
  const letras = t.match(/\p{L}/gu) ?? [];
  return letras.length > 0 && letras.filter((c) => c === c.toUpperCase()).length / letras.length > 0.6;
};
const objetoCurto = (l: PncpContratacao) => {
  const completo = l.objetoCompra.replace(/\s+/g, " ").trim();
  const original = completo.split(/[,;]/)[0].trim();
  let objeto = completo.replace(PREAMBULO, "");
  if (/^empresa\b/iu.test(objeto)) {
    // "empresa especializada no ramo X, para execução de Y": o objeto é o que vem depois do "para".
    const fim = objeto.match(FIM_DO_PREAMBULO);
    objeto = fim?.index != null ? objeto.slice(fim.index + fim[0].length) : completo;
  }
  objeto = objeto.split(/[,;]/)[0].trim();
  const cortado = objeto.length > LIMITE_OBJETO;
  // Corta em palavra inteira e não termina em conectivo ("... dos espaços e ao").
  if (cortado) objeto = objeto.slice(0, objeto.lastIndexOf(" ", LIMITE_OBJETO)).replace(CONECTIVOS_NO_FIM, "");
  objeto = (objeto.replace(/[\s.:;–-]+$/u, "").trim() || original) + (cortado ? "…" : "");
  return emCaixaAlta(objeto) ? objeto.toLowerCase() : objeto.charAt(0).toLowerCase() + objeto.slice(1);
};

/** Termos específicos do evento — ao menos um deve aparecer na 1ª abordagem. */
export function referenciasDoGatilho(ev: ContextoGatilho): string[] {
  if (ev.codigo === "CNO") {
    const o = ev.dadosBrutos as CnoObra;
    return [o.cno, `${fmtNumero(o.areas[0].metragem)} m²`, `obra no ${titulo(o.bairro)}`, `obra no bairro ${titulo(o.bairro)}`, `obra em ${titulo(o.municipio)}`];
  }
  if (ev.codigo === "PNCP") {
    const l = ev.dadosBrutos as PncpContratacao;
    return [l.numeroControlePNCP, titulo(l.orgaoEntidade.razaoSocial), objetoCurto(l)];
  }
  return [`abertura em ${fmtData(ev.detectadoEm)}`, "recém-aberta", "abriu recentemente"];
}

export interface ValidacaoMensagem {
  valida: boolean;
  referenciaEncontrada: string | null;
  erro?: string;
}

export function validarPrimeiraAbordagem(conteudo: string, ev: ContextoGatilho): ValidacaoMensagem {
  const texto = normalizar(conteudo);
  const achada = referenciasDoGatilho(ev).find((r) => texto.includes(normalizar(r)));
  return achada
    ? { valida: true, referenciaEncontrada: achada }
    : { valida: false, referenciaEncontrada: null, erro: "A primeira abordagem precisa citar o gatilho específico (ex.: obra, licitação ou abertura da empresa)." };
}

/** Resumo legível do gatilho (usado no radar, na fila e no briefing). */
export function descreverGatilho(ev: ContextoGatilho): string {
  if (ev.codigo === "CNO") {
    const o = ev.dadosBrutos as CnoObra;
    const a = o.areas[0];
    return `Nova obra no CNO: ${a.destinacao.toLowerCase()} de ${fmtNumero(a.metragem)} m² no ${titulo(o.bairro)} (${titulo(o.municipio)})`;
  }
  if (ev.codigo === "PNCP") {
    const l = ev.dadosBrutos as PncpContratacao;
    if (l.resultado) return `Licitação vencida no PNCP: ${objetoCurto(l)} — ${titulo(l.orgaoEntidade.razaoSocial)} (${fmtMoeda(l.resultado.valorTotalHomologado ?? l.valorTotalEstimado)})`;
    return `Licitação PNCP: ${objetoCurto(l)} — ${titulo(l.orgaoEntidade.razaoSocial)} (${fmtMoeda(l.valorTotalEstimado)})`;
  }
  return `Empresa recém-aberta: abertura em ${fmtData(ev.detectadoEm)}`;
}

/** Gancho (o fato que motivou o contato) + momento (o "por que agora" que abre a
 *  frase do benefício da oferta do cliente). Base da 1ª abordagem. */
export function ganchoDoGatilho(ev: ContextoGatilho): { gancho: string; momento: string } {
  if (ev.codigo === "CNO") {
    const o = ev.dadosBrutos as CnoObra;
    const a = o.areas[0];
    return {
      gancho: `vi que vocês registraram a obra no ${titulo(o.bairro)} — ${a.destinacao.toLowerCase()} com ${fmtNumero(a.metragem)} m²`,
      momento: "nessa fase da obra",
    };
  }
  if (ev.codigo === "PNCP") {
    const l = ev.dadosBrutos as PncpContratacao;
    if (l.resultado) {
      return { gancho: `vi que vocês venceram a licitação de ${titulo(l.orgaoEntidade.razaoSocial)} (${objetoCurto(l)})`, momento: "para executar esse contrato dentro do prazo" };
    }
    return { gancho: `acompanhei a licitação publicada por ${titulo(l.orgaoEntidade.razaoSocial)} (${objetoCurto(l)})`, momento: "para fechar a composição de custos da proposta" };
  }
  return {
    gancho: `vi que a empresa é recém-aberta (abertura em ${fmtData(ev.detectadoEm)})`,
    momento: "nas primeiras obras da empresa",
  };
}
