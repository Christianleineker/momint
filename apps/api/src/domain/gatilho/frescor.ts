// Frescor do gatilho: quanto tempo o evento ainda "vale" (janela por tipo).
import { arredondar2, DIA_MS } from "../shared/numeros.js";

export interface JanelaGatilho {
  janelaFrescorDias: number;
  peso: number;
}

export interface Frescor {
  diasDecorridos: number;
  dentroDaJanela: boolean;
  /** 1 no dia da detecção → 0 no fim da janela */
  score: number;
}

export function calcularFrescor(detectadoEm: Date, tipo: JanelaGatilho, hoje: Date): Frescor {
  const dias = Math.max(0, Math.floor((hoje.getTime() - detectadoEm.getTime()) / DIA_MS));
  const dentro = dias <= tipo.janelaFrescorDias;
  return { diasDecorridos: dias, dentroDaJanela: dentro, score: dentro ? arredondar2(1 - dias / (tipo.janelaFrescorDias + 1)) : 0 };
}

export interface EventoComTipo {
  id: string;
  empresaId: string;
  resumo: string;
  detectadoEm: Date;
  tipo: JanelaGatilho & { codigo: string };
}

export interface GatilhoAtivo {
  id: string;
  codigo: string;
  resumo: string;
}

/** Agrupa, por empresa, os gatilhos ainda dentro da janela (base do empilhamento). */
export function agruparGatilhosAtivos(eventos: EventoComTipo[], hoje: Date): Map<string, GatilhoAtivo[]> {
  const mapa = new Map<string, GatilhoAtivo[]>();
  for (const ev of eventos) {
    if (!calcularFrescor(ev.detectadoEm, ev.tipo, hoje).dentroDaJanela) continue;
    const lista = mapa.get(ev.empresaId) ?? [];
    lista.push({ id: ev.id, codigo: ev.tipo.codigo, resumo: ev.resumo });
    mapa.set(ev.empresaId, lista);
  }
  return mapa;
}
