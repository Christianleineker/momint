// Planejamento do lead de UMA empresa para UM cliente a partir de todos os
// gatilhos da empresa (regra 2: fit E frescor; regra 3: empilhamento).
import type { ResultadoFit } from "../icp/fit.js";
import { calcularFrescor } from "../gatilho/frescor.js";
import { classificarPrioridade, scorePrioridade, type Prioridade } from "./prioridade.js";
import type { Estagio } from "./estados.js";

export interface EventoPlano {
  id: string;
  codigo: string;
  detectadoEm: Date;
  janelaFrescorDias: number;
  peso: number;
}

export interface LeadExistente {
  estagio: Estagio;
  eventoDetectadoEm: Date;
}

export type PlanoLead =
  | { acao: "NENHUMA"; motivo: string }
  | { acao: "CRIAR"; estagio: Estagio; eventoId: string; score: number; prioridade: Prioridade }
  | { acao: "ATUALIZAR"; estagio: Estagio; eventoId: string | null; score: number; prioridade: Prioridade };

/** Leads parados que um gatilho novo reabre (Reciclado). */
const RECICLAVEIS: Estagio[] = ["NUTRICAO", "PERDIDO", "SEM_CONTATO", "DESQUALIFICADO"];
/** Estágios "pré-conversa": se todos os gatilhos expiram aqui, o lead vai para Nutrição. */
const PRE_CONVERSA: Estagio[] = ["DETECTADO", "APTO", "RECICLADO"];

export function planejarLead(p: {
  fit: ResultadoFit;
  eventos: EventoPlano[];
  fontesAtivas: string[];
  lead: LeadExistente | null;
  taxaConversaoHist: number;
  hoje: Date;
}): PlanoLead {
  if (!p.fit.apto) return { acao: "NENHUMA", motivo: "Fora do ICP" };

  const avaliados = p.eventos
    .filter((e) => p.fontesAtivas.includes(e.codigo))
    .map((e) => ({ ...e, frescor: calcularFrescor(e.detectadoEm, e, p.hoje) }))
    .sort((a, b) => b.detectadoEm.getTime() - a.detectadoEm.getTime());
  if (avaliados.length === 0) return { acao: "NENHUMA", motivo: "Nenhum gatilho de fonte ativa" };

  const ativos = avaliados.filter((e) => e.frescor.dentroDaJanela);
  const score = scorePrioridade(p.fit.forca, avaliados.map((e) => ({ peso: e.peso, frescor: e.frescor.score })), p.taxaConversaoHist);
  const prioridade = classificarPrioridade(score, ativos.length);
  const maisRecenteAtivo = ativos[0];

  if (!p.lead) {
    return maisRecenteAtivo
      ? { acao: "CRIAR", estagio: "APTO", eventoId: maisRecenteAtivo.id, score, prioridade }
      : { acao: "CRIAR", estagio: "NUTRICAO", eventoId: avaliados[0].id, score, prioridade };
  }

  if (RECICLAVEIS.includes(p.lead.estagio) && maisRecenteAtivo && maisRecenteAtivo.detectadoEm > p.lead.eventoDetectadoEm) {
    return { acao: "ATUALIZAR", estagio: "RECICLADO", eventoId: maisRecenteAtivo.id, score, prioridade };
  }
  if (PRE_CONVERSA.includes(p.lead.estagio) && !maisRecenteAtivo) {
    return { acao: "ATUALIZAR", estagio: "NUTRICAO", eventoId: null, score, prioridade };
  }
  return { acao: "ATUALIZAR", estagio: p.lead.estagio, eventoId: null, score, prioridade };
}
