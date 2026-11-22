import type { Tom } from "@/components/ui";

/** Rótulos iguais aos do domínio da API (domain/lead/estados.ts). */
export const ROTULO_ESTAGIO: Record<string, string> = {
  DETECTADO: "Detectado",
  APTO: "Apto a abordar",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  EM_CADENCIA: "Em cadência",
  ENGAJADO: "Engajado",
  QUALIFICANDO: "Qualificando",
  REUNIAO_MARCADA: "Reunião marcada",
  REUNIAO_REALIZADA: "Reunião realizada",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
  SUPRIMIDO: "Suprimido",
  DESQUALIFICADO: "Desqualificado",
  SEM_CONTATO: "Sem contato",
  NUTRICAO: "Nutrição",
  RECICLADO: "Reciclado",
};

/** A mesma cor para o mesmo estágio em todas as telas. */
export const TOM_ESTAGIO: Record<string, Tom> = {
  DETECTADO: "cinza",
  APTO: "azul",
  AGUARDANDO_APROVACAO: "amarelo",
  EM_CADENCIA: "azul",
  ENGAJADO: "roxo",
  QUALIFICANDO: "roxo",
  REUNIAO_MARCADA: "verde",
  REUNIAO_REALIZADA: "verde",
  GANHO: "verde",
  PERDIDO: "vermelho",
  SUPRIMIDO: "cinza",
  DESQUALIFICADO: "vermelho",
  SEM_CONTATO: "cinza",
  NUTRICAO: "amarelo",
  RECICLADO: "cinza",
};

export const rotuloEstagio = (estagio: string) => ROTULO_ESTAGIO[estagio] ?? estagio;
export const tomEstagio = (estagio: string): Tom => TOM_ESTAGIO[estagio] ?? "cinza";

/** Colunas do kanban, na ordem do funil. Estágios fora delas vão para "Encerrados". */
export const COLUNAS_KANBAN = ["APTO", "AGUARDANDO_APROVACAO", "EM_CADENCIA", "ENGAJADO", "QUALIFICANDO", "REUNIAO_MARCADA", "REUNIAO_REALIZADA", "GANHO"];
