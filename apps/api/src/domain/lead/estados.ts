// Máquina de estados do lead.
// Fluxo principal: DETECTADO → APTO → AGUARDANDO_APROVACAO → EM_CADENCIA →
// ENGAJADO → QUALIFICANDO → REUNIAO_MARCADA → REUNIAO_REALIZADA → GANHO/PERDIDO
// Laterais: SUPRIMIDO, DESQUALIFICADO, SEM_CONTATO, NUTRICAO, RECICLADO.

export const ESTAGIOS = [
  "DETECTADO",
  "APTO",
  "AGUARDANDO_APROVACAO",
  "EM_CADENCIA",
  "ENGAJADO",
  "QUALIFICANDO",
  "REUNIAO_MARCADA",
  "REUNIAO_REALIZADA",
  "GANHO",
  "PERDIDO",
  "SUPRIMIDO",
  "DESQUALIFICADO",
  "SEM_CONTATO",
  "NUTRICAO",
  "RECICLADO",
] as const;

export type Estagio = (typeof ESTAGIOS)[number];

export const ROTULO_ESTAGIO: Record<Estagio, string> = {
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

const SAIDAS_LATERAIS: Estagio[] = ["DESQUALIFICADO", "SUPRIMIDO"];

const TRANSICOES: Record<Estagio, Estagio[]> = {
  DETECTADO: ["APTO", "NUTRICAO", "SEM_CONTATO", ...SAIDAS_LATERAIS],
  APTO: ["AGUARDANDO_APROVACAO", "SEM_CONTATO", "NUTRICAO", ...SAIDAS_LATERAIS],
  AGUARDANDO_APROVACAO: ["EM_CADENCIA", "APTO", "NUTRICAO", ...SAIDAS_LATERAIS],
  EM_CADENCIA: ["ENGAJADO", "SEM_CONTATO", "NUTRICAO", ...SAIDAS_LATERAIS],
  ENGAJADO: ["QUALIFICANDO", "PERDIDO", "NUTRICAO", ...SAIDAS_LATERAIS],
  QUALIFICANDO: ["REUNIAO_MARCADA", "PERDIDO", "NUTRICAO", ...SAIDAS_LATERAIS],
  REUNIAO_MARCADA: ["REUNIAO_REALIZADA", "QUALIFICANDO", "PERDIDO", ...SAIDAS_LATERAIS],
  REUNIAO_REALIZADA: ["GANHO", "PERDIDO", "NUTRICAO", ...SAIDAS_LATERAIS],
  GANHO: [],
  PERDIDO: ["RECICLADO"],
  SUPRIMIDO: [], // opt-out é definitivo
  DESQUALIFICADO: ["RECICLADO"],
  SEM_CONTATO: ["RECICLADO", "APTO"],
  NUTRICAO: ["RECICLADO"],
  RECICLADO: ["APTO", "AGUARDANDO_APROVACAO", ...SAIDAS_LATERAIS],
};

export function podeTransicionar(de: Estagio, para: Estagio): boolean {
  return TRANSICOES[de].includes(para);
}

export function transicoesPossiveis(de: Estagio): Estagio[] {
  return TRANSICOES[de];
}

export interface QualificacaoInput {
  necessidade: boolean;
  momento: boolean;
  encaixe: boolean;
  qualificacaoForcada: boolean;
}

/** Regra 6: só agenda com os 3 critérios marcados (ou forçado pelo vendedor). */
export function podeAgendar(q: QualificacaoInput): boolean {
  return q.qualificacaoForcada || (q.necessidade && q.momento && q.encaixe);
}
