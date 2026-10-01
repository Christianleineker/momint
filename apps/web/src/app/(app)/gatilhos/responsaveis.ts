import type { Gatilho } from "./GatilhoAcoes";

export const RESPONSAVEIS = ["Rafael Nunes", "Carla Dias", "Gestor ImperSul"];

export function chaveResponsavel(nome: string) {
  return nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function responsaveisDisponiveis(gatilhos: Gatilho[], ignorarId?: string) {
  const ocupados = new Set(gatilhos.filter((g) => g.id !== ignorarId).map((g) => chaveResponsavel(g.responsavel)));
  return RESPONSAVEIS.filter((nome) => !ocupados.has(chaveResponsavel(nome)));
}

export function corrigirResponsaveis(gatilhos: Gatilho[]) {
  const disponiveis = responsaveisDisponiveis(gatilhos);
  const usados = new Set<string>();
  return gatilhos.map((gatilho) => {
    const chave = chaveResponsavel(gatilho.responsavel);
    if (chave && !usados.has(chave)) {
      usados.add(chave);
      return gatilho;
    }
    // Mantém os gatilhos antigos excedentes pausados, sem repetir uma pessoa.
    const responsavel = disponiveis.shift() ?? "";
    if (responsavel) usados.add(chaveResponsavel(responsavel));
    return { ...gatilho, responsavel, ativo: responsavel ? gatilho.ativo : false };
  });
}
