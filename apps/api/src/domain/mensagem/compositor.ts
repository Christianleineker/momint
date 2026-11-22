// Geração de mensagens (determinística, por templates). Um LLM real pode
// substituir `comporPrimeiraAbordagem` mantendo o mesmo contrato.
// O texto comercial vem da oferta cadastrada pelo cliente (OfertaCliente):
// nada do que ele vende fica escrito aqui.
import { capitalizar, continuarFrase, titulo } from "./formatacao.js";
import { descreverGatilho, ganchoDoGatilho, type ContextoGatilho } from "./referencias.js";

export type CanalMensagem = "EMAIL" | "WHATSAPP";
export type VozMarca = "consultivo" | "direto" | "proximo";

export interface MensagemGerada {
  assunto: string | null;
  conteudo: string;
}

/** Recorte da oferta do cliente usado na 1ª abordagem. */
export interface OfertaMensagem {
  produto: string;
  proposta: string;
  beneficio: string;
}

export interface EntradaComposicao {
  evento: ContextoGatilho;
  empresa: { nome: string };
  contato: { nome: string } | null;
  remetente: { nome: string; empresa: string };
  oferta: OfertaMensagem;
  canal: CanalMensagem;
  voz: VozMarca;
}

const CHAMADA: Record<VozMarca, string> = {
  direto: "Tem 15 minutos esta semana para eu te mostrar como fazemos?",
  proximo: "Topa um café rápido (pode ser on-line) pra gente trocar uma ideia?",
  consultivo: "Faz sentido conversarmos 15 minutos para eu entender o cronograma e sugerir a melhor solução?",
};

export function comporPrimeiraAbordagem(inp: EntradaComposicao): MensagemGerada {
  const { gancho, momento } = ganchoDoGatilho(inp.evento);
  const saudacao = inp.contato ? `Olá, ${titulo(inp.contato.nome.split(" ")[0])}` : "Olá";
  const cta = CHAMADA[inp.voz] ?? CHAMADA.consultivo;
  const porQueAgora = `${capitalizar(momento)}, ${continuarFrase(inp.oferta.beneficio)}.`;
  const apresentacao = `Na ${inp.remetente.empresa}, ${continuarFrase(inp.oferta.proposta)}.`;

  if (inp.canal === "WHATSAPP") {
    return { assunto: null, conteudo: `${saudacao}! Aqui é ${inp.remetente.nome}, da ${inp.remetente.empresa}. ${capitalizar(gancho)}. ${porQueAgora} ${cta}` };
  }
  return {
    assunto: `${inp.empresa.nome} — ${continuarFrase(inp.oferta.produto)} para a nova etapa`,
    conteudo: `${saudacao},\n\n${capitalizar(gancho)}. ${porQueAgora}\n\n${apresentacao}\n\n${cta}\n\nAbraço,\n${inp.remetente.nome}\n${inp.remetente.empresa}`,
  };
}

export interface EntradaBriefing {
  empresa: { nome: string; municipio: string; porte: string; cnaeDescricao: string; idadeAnos: number };
  gatilhos: ContextoGatilho[];
  qualificacao: { necessidade: boolean; momento: boolean; encaixe: boolean };
  /** Recorte da oferta do cliente: quem decide do lado do lead e o foco técnico. */
  oferta: { compradores: string; pauta: string };
  ultimaResposta?: string | null;
}

/** Briefing pré-reunião: contexto da empresa + gatilhos + qualificação + oferta. */
export function gerarBriefing(inp: EntradaBriefing): string {
  const q = inp.qualificacao;
  const marca = (ok: boolean) => (ok ? "[sim]" : "[nao]");
  const linhas = [
    `Empresa: ${inp.empresa.nome} — ${inp.empresa.cnaeDescricao}, ${titulo(inp.empresa.municipio)}, porte ${inp.empresa.porte.toLowerCase()}, ${Math.floor(inp.empresa.idadeAnos)} anos de atividade.`,
    `Por que agora: ${inp.gatilhos.map(descreverGatilho).join("; ")}.`,
    `Qualificação: necessidade ${marca(q.necessidade)} · momento ${marca(q.momento)} · encaixe ${marca(q.encaixe)}.`,
  ];
  if (inp.ultimaResposta) linhas.push(`Última resposta do lead: "${inp.ultimaResposta}"`);
  linhas.push(`Quem costuma decidir: ${continuarFrase(inp.oferta.compradores)}.`);
  linhas.push(`Sugestão de pauta: 1) cronograma e fase atual da obra; 2) ${continuarFrase(inp.oferta.pauta)}; 3) quem decide a compra e prazo de cotação.`);
  return linhas.join("\n");
}
