// Contexto do gatilho numa mensagem (regra 5): toda 1ª abordagem precisa citar
// o evento específico que motivou o contato.
import type { CnoObra, CodigoGatilho, PncpContratacao } from "../gatilho/dados-publicos.js";
import { fmtData, fmtMoeda, fmtNumero, normalizar, titulo } from "./formatacao.js";

export interface ContextoGatilho {
  codigo: CodigoGatilho;
  detectadoEm: Date;
  dadosBrutos: unknown;
}

const objetoCurto = (l: PncpContratacao) => l.objetoCompra.split(/[,;]/)[0];

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
    return `Licitação PNCP: ${objetoCurto(l)} — ${titulo(l.orgaoEntidade.razaoSocial)} (${fmtMoeda(l.valorTotalEstimado)})`;
  }
  return `Empresa recém-aberta: abertura em ${fmtData(ev.detectadoEm)}`;
}

/** Frase de gancho + dor associada ao gatilho, base da 1ª abordagem. */
export function ganchoDoGatilho(ev: ContextoGatilho): { gancho: string; dor: string } {
  if (ev.codigo === "CNO") {
    const o = ev.dadosBrutos as CnoObra;
    const a = o.areas[0];
    return {
      gancho: `vi que vocês registraram a obra no ${titulo(o.bairro)} — ${a.destinacao.toLowerCase()} com ${fmtNumero(a.metragem)} m²`,
      dor: "nessa fase, definir o sistema de impermeabilização de fundações e lajes cedo evita retrabalho caro lá na frente",
    };
  }
  if (ev.codigo === "PNCP") {
    const l = ev.dadosBrutos as PncpContratacao;
    return {
      gancho: `acompanhei a licitação publicada por ${titulo(l.orgaoEntidade.razaoSocial)} (${objetoCurto(l).toLowerCase()})`,
      dor: "ter um parceiro de impermeabilização com proposta técnica pronta ajuda a fechar a composição de custos com segurança",
    };
  }
  return {
    gancho: `vi que a empresa é recém-aberta (abertura em ${fmtData(ev.detectadoEm)})`,
    dor: "começar com fornecedores de impermeabilização homologados costuma poupar dor de cabeça nas primeiras obras",
  };
}
