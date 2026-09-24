// Score de prioridade (regra 3): fit + peso do gatilho + frescor + histórico.
import { arredondar2 } from "../shared/numeros.js";

export interface EventoParaScore {
  peso: number;
  frescor: number;
}

/** Gatilhos empilhados SOMAM (cada evento ativo contribui peso×frescor). Escala 0..100. */
export function scorePrioridade(forcaFit: number, eventos: EventoParaScore[], taxaConversaoHist: number): number {
  const ativos = eventos.filter((e) => e.frescor > 0);
  const gatilho = ativos.reduce((acc, e) => acc + e.peso * e.frescor, 0);
  const bruto = forcaFit * 30 + gatilho * 45 + taxaConversaoHist * 15 + (ativos.length >= 2 ? 10 : 0);
  return Math.min(100, arredondar2(bruto));
}

export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

/** 2+ gatilhos ativos na mesma empresa ⇒ sempre Alta. */
export function classificarPrioridade(score: number, gatilhosAtivos: number): Prioridade {
  if (gatilhosAtivos >= 2 || score >= 70) return "ALTA";
  if (score >= 45) return "MEDIA";
  return "BAIXA";
}
