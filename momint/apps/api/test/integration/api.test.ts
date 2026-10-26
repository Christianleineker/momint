// Testes de integração contra o banco de teste (momint_test), com seed completo.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";

const db = new PrismaClient();
let app: FastifyInstance;

async function login(email: string) {
  const r = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, senha: SENHA_DEMO } });
  expect(r.statusCode).toBe(200);
  const cookie = r.cookies[0];
  return { cookie: `${cookie.name}=${cookie.value}` };
}
const req = (h: { cookie: string }, method: "GET" | "POST" | "PUT" | "PATCH", url: string, payload?: object) =>
  app.inject({ method, url, headers: h, payload });

const leadPorEmpresa = async (clienteNome: string, fantasia: string) =>
  db.lead.findFirstOrThrow({ where: { cliente: { nome: clienteNome }, empresa: { nomeFantasia: fantasia } } });

beforeAll(async () => {
  await seed(db);
  app = await criarApp({ container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio("2026-09-30") }), jwtSecret: "test" });
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("Autenticação", () => {
  it("rejeita senha errada e rota sem sessão", async () => {
    const r = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "gestor@impersul.com.br", senha: "x" } });
    expect(r.statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/leads" })).statusCode).toBe(401);
  });
});

describe("Motor de match no seed", () => {
  it("cria leads só para empresas no ICP e com gatilho fresco", async () => {
    const leads = await db.lead.findMany({ where: { cliente: { nome: "ImperSul Impermeabilizações" } }, include: { empresa: true } });
    const nomes = leads.map((l) => l.empresa.nomeFantasia);
    expect(nomes).not.toContain("Vértice Construtora"); // baixada
    expect(nomes).not.toContain("Litoral Obras"); // fora do raio
    expect(nomes).not.toContain("Pão Dourado"); // CNAE fora
    expect(leads.find((l) => l.empresa.nomeFantasia === "Construtora Pinheiro")?.estagio).toBe("NUTRICAO"); // PNCP expirado
  });

  it("Prisma (2 gatilhos empilhados) aparece como prioridade Alta no radar", async () => {
    const h = await login("gestor@impersul.com.br");
    const radar = (await req(h, "GET", "/api/radar")).json() as Array<{ empresa: { nome: string }; prioridade: string; gatilhosEmpilhados: number }>;
    const prisma = radar.filter((r) => r.empresa.nome === "Prisma Incorporadora");
    expect(prisma).toHaveLength(2);
    expect(prisma.every((r) => r.prioridade === "ALTA" && r.gatilhosEmpilhados === 2)).toBe(true);
  });
});

describe("Fila de aprovação (Copiloto)", () => {
  it("aprovar tira da fila, envia e move o lead para Em cadência", async () => {
    const h = await login("rafael@impersul.com.br");
    const fila = (await req(h, "GET", "/api/abordagens/fila")).json() as Array<{ id: string; lead: { id: string } }>;
    expect(fila.length).toBe(4);
    const antes = ((await req(h, "GET", "/api/auth/me")).json() as { aprovacoesPendentes: number }).aprovacoesPendentes;

    expect((await req(h, "POST", `/api/mensagens/${fila[0].id}/aprovar`)).statusCode).toBe(200);
    const depois = ((await req(h, "GET", "/api/auth/me")).json() as { aprovacoesPendentes: number }).aprovacoesPendentes;
    expect(depois).toBe(antes - 1);
    expect((await db.lead.findUniqueOrThrow({ where: { id: fila[0].lead.id } })).estagio).toBe("EM_CADENCIA");
    expect((await db.mensagem.findUniqueOrThrow({ where: { id: fila[0].id } })).status).toBe("ENVIADA");
  });

  it("Regra 5 — edição que remove a citação do gatilho é rejeitada", async () => {
    const h = await login("rafael@impersul.com.br");
    const [m] = (await req(h, "GET", "/api/abordagens/fila")).json() as Array<{ id: string }>;
    const r = await req(h, "PUT", `/api/mensagens/${m.id}`, { conteudo: "Olá, somos a ImperSul. Vamos conversar?" });
    expect(r.statusCode).toBe(422);
    const r2 = await req(h, "POST", `/api/mensagens/${m.id}/aprovar`, { conteudo: "Olá, texto genérico sem contexto." });
    expect(r2.statusCode).toBe(422);
  });

  it("Regra 4 — no Copiloto a abordagem nasce como rascunho (nada é enviado)", async () => {
    const h = await login("gestor@impersul.com.br");
    const bauen = await leadPorEmpresa("ImperSul Impermeabilizações", "Bauen Construções");
    const r = await req(h, "POST", `/api/leads/${bauen.id}/abordar`, {});
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe("RASCUNHO");
    expect((await db.lead.findUniqueOrThrow({ where: { id: bauen.id } })).estagio).toBe("AGUARDANDO_APROVACAO");
  });
});

describe("Regra 6 — qualificação antes do agendamento", () => {
  it("bloqueia agendar com qualificação incompleta e permite com override", async () => {
    const h = await login("gestor@impersul.com.br");
    const prime = await leadPorEmpresa("ImperSul Impermeabilizações", "Araucária Prime"); // necessidade+momento, sem encaixe
    const payload = { inicio: "2026-10-05T14:00:00Z", duracaoMin: 45 };
    expect((await req(h, "POST", `/api/leads/${prime.id}/reunioes`, payload)).statusCode).toBe(422);
    await req(h, "PATCH", `/api/leads/${prime.id}/qualificacao`, { qualificacaoForcada: true });
    const ok = await req(h, "POST", `/api/leads/${prime.id}/reunioes`, payload);
    expect(ok.statusCode).toBe(200);
    expect(ok.json().briefing).toMatch(/Por que agora/);
  });

  it("Kanban não permite pular para Reunião marcada", async () => {
    const h = await login("gestor@impersul.com.br");
    const ribeira = await leadPorEmpresa("ImperSul Impermeabilizações", "Ribeira Incorporações");
    expect((await req(h, "PATCH", `/api/leads/${ribeira.id}/estagio`, { estagio: "REUNIAO_MARCADA" })).statusCode).toBe(409);
    expect((await req(h, "PATCH", `/api/leads/${ribeira.id}/estagio`, { estagio: "GANHO" })).statusCode).toBe(409);
  });
});

describe("Regra 7 — opt-out global", () => {
  it("contato suprimido por um cliente não é abordado por nenhum outro", async () => {
    const hImp = await login("gestor@impersul.com.br");
    const monteiroImp = await leadPorEmpresa("ImperSul Impermeabilizações", "Monteiro Engenharia");
    const contato = await db.contato.findFirstOrThrow({ where: { empresaId: monteiroImp.empresaId } });
    expect((await req(hImp, "POST", `/api/contatos/${contato.id}/optout`)).statusCode).toBe(200);

    const monteiroOutro = await leadPorEmpresa("Esquadrias Paraná", "Monteiro Engenharia");
    expect(monteiroOutro.estagio).toBe("SUPRIMIDO");
    const hOutro = await login("admin@esquadrias.com.br");
    const r = await req(hOutro, "POST", `/api/leads/${monteiroOutro.id}/abordar`, {});
    expect(r.statusCode).toBe(409);
  });
});

describe("Regra 8 — isolamento multi-cliente", () => {
  it("um cliente não enxerga nem altera leads de outro", async () => {
    const hOutro = await login("admin@esquadrias.com.br");
    const leadsOutro = (await req(hOutro, "GET", "/api/leads")).json() as Array<{ empresa: { nome: string } }>;
    expect(leadsOutro.map((l) => l.empresa.nome)).not.toContain("Prisma Incorporadora");

    const leadImp = await leadPorEmpresa("ImperSul Impermeabilizações", "Ribeira Incorporações");
    expect((await req(hOutro, "GET", `/api/leads/${leadImp.id}`)).statusCode).toBe(404);
    expect((await req(hOutro, "PATCH", `/api/leads/${leadImp.id}/estagio`, { estagio: "PERDIDO" })).statusCode).toBe(404);
    const fila = (await req(hOutro, "GET", "/api/abordagens/fila")).json() as unknown[];
    expect(fila).toHaveLength(0);
  });
});
