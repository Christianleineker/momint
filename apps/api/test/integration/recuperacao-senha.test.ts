import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";
import { carregarEnv } from "../../src/config/env.js";

const db = new PrismaClient();
const emails: Array<{ destinatario: string; assunto: string; texto: string }> = [];
let app: FastifyInstance;
let agora = new Date("2026-10-09T15:00:00Z");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

beforeAll(async () => {
  await seed(db);
  app = await criarApp({ jwtSecret: "test", container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio("2026-09-30"), agoraAutenticacao: () => agora, email: { enviar: async (mensagem) => { emails.push(mensagem); } } }) });
});
afterAll(async () => { await app.close(); await db.$disconnect(); });

async function solicitar(email: string) {
  const antes = emails.length;
  const resposta = await app.inject({ method: "POST", url: "/api/auth/recuperar-senha", payload: { email } });
  expect(resposta.statusCode).toBe(202);
  await vi.waitFor(() => expect(emails.length).toBeGreaterThan(antes));
  return emails.slice(antes).find((e) => e.texto.includes("#token="))!.texto.match(/#token=([a-f0-9]{64})/)![1];
}
const validar = (token: string) => app.inject({ method: "POST", url: "/api/auth/recuperacao/validar", payload: { token } });
const redefinir = (token: string, senha = "NovaSenhaTeste123!") => app.inject({ method: "POST", url: "/api/auth/redefinir-senha", payload: { token, senha } });
async function login(email: string, senha = SENHA_DEMO) {
  const resposta = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, senha } });
  expect(resposta.statusCode).toBe(200);
  return `${resposta.cookies[0].name}=${resposta.cookies[0].value}`;
}

describe("Recuperação de senha", () => {
  it("responde sem revelar contas, não cadastra e não expõe o token na resposta", async () => {
    const quantidade = await db.usuario.count();
    const conhecido = await app.inject({ method: "POST", url: "/api/auth/recuperar-senha", payload: { email: "gestor@impersul.com.br" } });
    const desconhecido = await app.inject({ method: "POST", url: "/api/auth/recuperar-senha", payload: { email: "inexistente@example.com" } });
    expect(conhecido.statusCode).toBe(202);
    expect(desconhecido.json()).toEqual(conhecido.json());
    expect(conhecido.body).not.toContain("token");
    await vi.waitFor(() => expect(emails).toHaveLength(1));
    expect(await db.usuario.count()).toBe(quantidade);
    expect(emails[0].destinatario).toBe("gestor@impersul.com.br");
  });

  it("armazena só o hash, expira em 30 minutos reais e substitui links anteriores", async () => {
    const primeiro = emails[0].texto.match(/#token=([a-f0-9]{64})/)![1];
    const salvo = await db.recuperacaoSenha.findUniqueOrThrow({ where: { tokenHash: hash(primeiro) } });
    expect(salvo.tokenHash).not.toBe(primeiro);
    expect(salvo.expiraEm.getTime()).toBe(agora.getTime() + 30 * 60_000);
    expect((await validar(primeiro)).json().valido).toBe(true);
    agora = new Date(agora.getTime() + 30 * 60_000);
    expect((await validar(primeiro)).json().valido).toBe(false);
    expect((await redefinir(primeiro)).statusCode).toBe(400);
    const segundo = await solicitar("gestor@impersul.com.br");
    const terceiro = await solicitar("gestor@impersul.com.br");
    expect(segundo).not.toBe(terceiro);
    expect((await validar(segundo)).json().valido).toBe(false);
    expect((await validar(terceiro)).json().valido).toBe(true);
  });

  it("permite um único uso mesmo em paralelo, altera a senha e revoga só as sessões daquele usuário", async () => {
    const cookieAntigo = await login("rafael@impersul.com.br");
    const cookieOutro = await login("gestor@impersul.com.br");
    const token = await solicitar("rafael@impersul.com.br");
    const respostas = await Promise.all([redefinir(token), redefinir(token)]);
    expect(respostas.map((r) => r.statusCode).sort()).toEqual([200, 400]);
    expect((await validar(token)).json().valido).toBe(false);
    expect((await redefinir(token)).statusCode).toBe(400);
    expect((await app.inject({ url: "/api/auth/me", headers: { cookie: cookieAntigo } })).statusCode).toBe(401);
    expect((await app.inject({ url: "/api/auth/me", headers: { cookie: cookieOutro } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "rafael@impersul.com.br", senha: SENHA_DEMO } })).statusCode).toBe(401);
    const cookieNovo = await login("rafael@impersul.com.br", "NovaSenhaTeste123!");
    expect((await app.inject({ url: "/api/auth/me", headers: { cookie: cookieNovo } })).statusCode).toBe(200);
    await vi.waitFor(() => expect(emails.some((e) => e.assunto.includes("foi alterada"))).toBe(true));
    expect(emails.find((e) => e.assunto.includes("foi alterada"))!.texto).not.toContain("NovaSenhaTeste123!");
  });

  it("rejeita senha curta e conta desativada sem consumir o link por entrada inválida", async () => {
    const token = await solicitar("carla@impersul.com.br");
    expect((await redefinir(token, "curta")).statusCode).toBe(400);
    expect((await redefinir(token, "á".repeat(40))).statusCode).toBe(400);
    expect((await validar(token)).json().valido).toBe(true);
    await db.usuario.update({ where: { email: "carla@impersul.com.br" }, data: { ativo: false } });
    expect((await validar(token)).json().valido).toBe(false);
    expect((await redefinir(token)).statusCode).toBe(400);
  });

  it("limita solicitações por e-mail mesmo com IPs diferentes", async () => {
    for (let i = 0; i < 4; i++) {
      const resposta = await app.inject({ method: "POST", url: "/api/auth/recuperar-senha", remoteAddress: `10.0.0.${i + 1}`, payload: { email: i % 2 ? " LIMITE@example.com " : "limite@example.com" } });
      expect(resposta.statusCode).toBe(i < 3 ? 202 : 429);
    }
  });

  it("bloqueia prévia local, HTTP e SMTP incompleto em produção", () => {
    expect(() => carregarEnv({ DATABASE_URL: "db", JWT_SECRET: "test", NODE_ENV: "production" })).toThrow();
    expect(() => carregarEnv({ DATABASE_URL: "db", JWT_SECRET: "test", NODE_ENV: "production", URL_WEB: "https://momint.example.com", EMAIL_TRANSPORT: "smtp" })).toThrow();
  });
});
