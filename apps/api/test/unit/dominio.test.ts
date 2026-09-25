import { describe, expect, it } from "vitest";
import { avaliarFit, type EmpresaFirmografia, type PerfilIcp } from "../../src/domain/icp/fit.js";
import { calcularFrescor } from "../../src/domain/gatilho/frescor.js";
import { classificarPrioridade, scorePrioridade } from "../../src/domain/lead/prioridade.js";
import { planejarLead } from "../../src/domain/lead/planejamento.js";
import { podeAgendar, podeTransicionar } from "../../src/domain/lead/estados.js";
import { comporPrimeiraAbordagem } from "../../src/domain/mensagem/compositor.js";
import { validarPrimeiraAbordagem, type ContextoGatilho } from "../../src/domain/mensagem/referencias.js";
import { licitacoesFixture, obrasFixture } from "../../src/infra/fontes-publicas/fixtures/index.js";

const HOJE = new Date("2026-09-30T12:00:00Z");
const icp: PerfilIcp = {
  cnaes: ["4120400", "4110700"], portes: ["EMPRESA DE PEQUENO PORTE", "DEMAIS"],
  latBase: -25.4284, lngBase: -49.2733, raioKm: 40, idadeMinAnos: 0, idadeMaxAnos: 30, situacaoExigida: "ATIVA",
};
const empresaOk: EmpresaFirmografia = { cnae: "4120400", porte: "DEMAIS", situacao: "ATIVA", dataInicioAtividade: new Date("2012-01-01"), lat: -25.5347, lng: -49.2064 };

describe("Regra 1 — fit de ICP é E lógico dos 5 critérios", () => {
  it("aprova quando todos os critérios batem", () => {
    const r = avaliarFit(empresaOk, icp, HOJE);
    expect(r.apto).toBe(true);
    expect(r.forca).toBeGreaterThan(0.6);
  });

  it.each([
    ["cnae", { cnae: "1091101" }],
    ["porte", { porte: "MICRO EMPRESA" }],
    ["regiao", { lat: -25.5163, lng: -48.5225 }], // Paranaguá, ~77 km
    ["situacao", { situacao: "BAIXADA" }],
    ["idade", { dataInicioAtividade: new Date("1980-01-01") }],
  ])("reprova se só %s falhar", (criterio, patch) => {
    const r = avaliarFit({ ...empresaOk, ...patch }, icp, HOJE);
    expect(r.apto).toBe(false);
    expect(r.criterios[criterio as keyof typeof r.criterios]).toBe(false);
    expect(Object.values(r.criterios).filter((ok) => !ok)).toHaveLength(1);
    expect(r.forca).toBe(0);
  });

  it("empresa sem coordenada não passa no critério de região", () => {
    expect(avaliarFit({ ...empresaOk, lat: null, lng: null }, icp, HOJE).criterios.regiao).toBe(false);
  });
});

describe("Frescor e prioridade", () => {
  it("frescor decai até o fim da janela e zera fora dela", () => {
    const tipo = { janelaFrescorDias: 30, peso: 1 };
    expect(calcularFrescor(HOJE, tipo, HOJE).score).toBe(1);
    const meio = calcularFrescor(new Date("2026-09-15T12:00:00Z"), tipo, HOJE);
    expect(meio.dentroDaJanela).toBe(true);
    expect(meio.score).toBeLessThan(1);
    const fora = calcularFrescor(new Date("2026-08-01T12:00:00Z"), tipo, HOJE);
    expect(fora).toMatchObject({ dentroDaJanela: false, score: 0 });
  });

  it("Regra 3 — gatilhos empilhados somam prioridade", () => {
    const um = scorePrioridade(0.8, [{ peso: 1, frescor: 0.8 }], 0.3);
    const dois = scorePrioridade(0.8, [{ peso: 1, frescor: 0.8 }, { peso: 0.8, frescor: 0.9 }], 0.3);
    expect(dois).toBeGreaterThan(um);
    expect(classificarPrioridade(dois, 2)).toBe("ALTA");
  });

  it("gatilho expirado não contribui para o score", () => {
    expect(scorePrioridade(0.8, [{ peso: 1, frescor: 0 }], 0.3)).toBe(scorePrioridade(0.8, [], 0.3));
  });
});

describe("Regra 2 — evento vira lead só com fit E frescor", () => {
  const fit = avaliarFit(empresaOk, icp, HOJE);
  const ev = (id: string, data: string, janela = 30) => ({ id, codigo: "PNCP", detectadoEm: new Date(data), janelaFrescorDias: janela, peso: 0.8 });
  const base = { fit, fontesAtivas: ["CNO", "PNCP", "CNPJ_NOVO"], lead: null, taxaConversaoHist: 0.3, hoje: HOJE };

  it("dentro da janela → cria lead Apto", () => {
    expect(planejarLead({ ...base, eventos: [ev("a", "2026-09-20")] })).toMatchObject({ acao: "CRIAR", estagio: "APTO", eventoId: "a" });
  });

  it("fora da janela → Nutrição (não abordagem ativa)", () => {
    expect(planejarLead({ ...base, eventos: [ev("a", "2026-08-01")] })).toMatchObject({ acao: "CRIAR", estagio: "NUTRICAO" });
  });

  it("sem fit → nenhuma ação, mesmo com gatilho fresco", () => {
    const semFit = avaliarFit({ ...empresaOk, situacao: "BAIXADA" }, icp, HOJE);
    expect(planejarLead({ ...base, fit: semFit, eventos: [ev("a", "2026-09-29")] }).acao).toBe("NENHUMA");
  });

  it("fonte desativada no ICP é ignorada", () => {
    expect(planejarLead({ ...base, fontesAtivas: ["CNO"], eventos: [ev("a", "2026-09-29")] }).acao).toBe("NENHUMA");
  });

  it("novo gatilho em lead Perdido/Nutrição → Reciclado", () => {
    const r = planejarLead({ ...base, lead: { estagio: "PERDIDO", eventoDetectadoEm: new Date("2026-05-01") }, eventos: [ev("novo", "2026-09-25"), ev("velho", "2026-05-01")] });
    expect(r).toMatchObject({ acao: "ATUALIZAR", estagio: "RECICLADO", eventoId: "novo" });
  });

  it("lead Apto cujo gatilho expirou → Nutrição (Adormecido)", () => {
    const r = planejarLead({ ...base, lead: { estagio: "APTO", eventoDetectadoEm: new Date("2026-08-01") }, eventos: [ev("a", "2026-08-01")] });
    expect(r).toMatchObject({ acao: "ATUALIZAR", estagio: "NUTRICAO" });
  });

  it("lead em conversa não é derrubado pela expiração do gatilho", () => {
    const r = planejarLead({ ...base, lead: { estagio: "ENGAJADO", eventoDetectadoEm: new Date("2026-08-01") }, eventos: [ev("a", "2026-08-01")] });
    expect(r).toMatchObject({ acao: "ATUALIZAR", estagio: "ENGAJADO" });
  });
});

describe("Máquina de estados", () => {
  it("segue o fluxo principal", () => {
    expect(podeTransicionar("APTO", "AGUARDANDO_APROVACAO")).toBe(true);
    expect(podeTransicionar("QUALIFICANDO", "REUNIAO_MARCADA")).toBe(true);
    expect(podeTransicionar("REUNIAO_REALIZADA", "GANHO")).toBe(true);
  });
  it("bloqueia saltos e reabertura de suprimido", () => {
    expect(podeTransicionar("APTO", "REUNIAO_MARCADA")).toBe(false);
    expect(podeTransicionar("DETECTADO", "GANHO")).toBe(false);
    expect(podeTransicionar("SUPRIMIDO", "RECICLADO")).toBe(false);
  });
  it("Regra 6 — agendamento exige os 3 critérios ou override", () => {
    expect(podeAgendar({ necessidade: true, momento: true, encaixe: false, qualificacaoForcada: false })).toBe(false);
    expect(podeAgendar({ necessidade: true, momento: true, encaixe: true, qualificacaoForcada: false })).toBe(true);
    expect(podeAgendar({ necessidade: false, momento: false, encaixe: false, qualificacaoForcada: true })).toBe(true);
  });
});

describe("Regra 5 — 1ª abordagem precisa citar o gatilho", () => {
  const cno: ContextoGatilho = { codigo: "CNO", detectadoEm: new Date("2026-09-22"), dadosBrutos: obrasFixture[0] };
  const pncp: ContextoGatilho = { codigo: "PNCP", detectadoEm: new Date("2026-09-12"), dadosBrutos: licitacoesFixture[1] };
  const novo: ContextoGatilho = { codigo: "CNPJ_NOVO", detectadoEm: new Date("2026-09-15T12:00:00Z"), dadosBrutos: {} };

  it.each([["CNO", cno], ["PNCP", pncp], ["CNPJ_NOVO", novo]])("mensagem gerada para %s é válida", (_n, ev) => {
    for (const canal of ["EMAIL", "WHATSAPP"] as const) {
      const m = comporPrimeiraAbordagem({ evento: ev, empresa: { nome: "X" }, contato: { nome: "Ana Souza" }, remetente: { nome: "Rafael", empresa: "ImperSul" }, canal, voz: "consultivo" });
      expect(validarPrimeiraAbordagem(m.conteudo, ev).valida).toBe(true);
    }
  });

  it("rejeita texto genérico", () => {
    const r = validarPrimeiraAbordagem("Olá! Somos especialistas em impermeabilização. Vamos conversar?", cno);
    expect(r.valida).toBe(false);
    expect(r.erro).toMatch(/gatilho/);
  });

  it("aceita referência sem acento/sem ponto de milhar", () => {
    expect(validarPrimeiraAbordagem("Vi a obra no agua verde, 8400 m²", cno).valida).toBe(true);
  });
});
