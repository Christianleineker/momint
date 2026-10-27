import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { InjectOptions } from "light-my-request";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";

const db = new PrismaClient();
let app: FastifyInstance;
let headers: { cookie: string };
let endereco = 1;
beforeEach(() => { endereco++; });
const injetar = (opcoes: InjectOptions) => app.inject({ ...opcoes, remoteAddress: `127.0.0.${endereco}` });
const cookie = (r: { cookies: Array<{ name: string; value: string }> }) => ({ cookie: `${r.cookies[0].name}=${r.cookies[0].value}` });
async function entrar(email = "rafael@impersul.com.br", senha = SENHA_DEMO) {
  const r = await injetar({ method: "POST", url: "/api/auth/login", payload: { email, senha } }); expect(r.statusCode).toBe(200); return cookie(r);
}
beforeAll(async () => {
  await seed(db);
  const demo = await db.cliente.findFirstOrThrow({ where: { demonstrativo: true } });
  await db.usuario.create({ data: { clienteId: demo.id, nome: "Admin", email: "jadiframe@gmail.com", papel: "ADMIN", senhaHash: await bcrypt.hash("SenhaAdminTeste123!", 4) } });
  app = await criarApp({ container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio("2026-09-30") }), jwtSecret: "test-perfil" });
  headers = await entrar();
});
afterAll(async () => { await app?.close(); await db.$disconnect(); });

describe("Edição de perfil e proteção dos dados operacionais", () => {
  it("permite editar nome e telefone sem acesso a cargos ou dados de outros usuários", async () => {
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", payload: { nome: "Teste", email: "rafael@impersul.com.br" } })).statusCode).toBe(401);
    const r = await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { nome: "Rafael Atualizado", email: "rafael@impersul.com.br", telefone: "41999990000" } });
    expect(r.statusCode).toBe(200); expect(r.json().telefone).toBe("41999990000"); expect(r.json().nome).toBe("Rafael Atualizado"); expect(r.json().papel).toBe("VENDEDOR"); expect(r.body).not.toContain("senhaHash");
    for (const extra of [{ papel: "ADMIN" }, { id: "outro-usuario" }, { clienteId: "outro-sistema" }, { cpf: "00000000000" }, { vendas: [] }]) {
      expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { nome: "Invasão", email: "rafael@impersul.com.br", ...extra } })).statusCode).toBe(400);
    }
    expect((await injetar({ url: "/api/auth/me", headers })).json().nome).toBe("Rafael Atualizado");
  });

  it("exige a senha atual para mudar e-mail e mantém somente a sessão renovada", async () => {
    const dados = { nome: "Rafael Atualizado", email: "rafael-novo@example.com" };
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: dados })).statusCode).toBe(400);
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { ...dados, senhaAtual: "errada" } })).statusCode).toBe(400);
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { ...dados, email: "carla@impersul.com.br", senhaAtual: SENHA_DEMO } })).statusCode).toBe(409);
    const anterior = headers;
    const r = await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { ...dados, senhaAtual: SENHA_DEMO } });
    expect(r.statusCode).toBe(200); headers = cookie(r);
    expect((await injetar({ url: "/api/auth/me", headers: anterior })).statusCode).toBe(401);
    expect((await injetar({ url: "/api/auth/me", headers })).json().email).toBe(dados.email);
    expect((await injetar({ method: "POST", url: "/api/auth/login", payload: { email: "rafael@impersul.com.br", senha: SENHA_DEMO } })).statusCode).toBe(401);
  });

  it("troca a senha, invalida links de recuperação e encerra as demais sessões", async () => {
    const u = await db.usuario.findUniqueOrThrow({ where: { email: "rafael-novo@example.com" } });
    const token = "a".repeat(64);
    await db.recuperacaoSenha.create({ data: { usuarioId: u.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiraEm: new Date(Date.now() + 60_000) } });
    const outraSessao = await entrar(u.email);
    const dados = { nome: u.nome, email: u.email, senhaAtual: SENHA_DEMO };
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { ...dados, novaSenha: "curta" } })).statusCode).toBe(400);
    const r = await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { ...dados, novaSenha: "NovaSenhaPerfil123!" } });
    expect(r.statusCode).toBe(200); headers = cookie(r);
    expect((await injetar({ url: "/api/auth/me", headers })).statusCode).toBe(200);
    expect((await injetar({ url: "/api/auth/me", headers: outraSessao })).statusCode).toBe(401);
    expect(await db.recuperacaoSenha.count({ where: { usuarioId: u.id } })).toBe(0);
    expect((await injetar({ method: "POST", url: "/api/auth/login", payload: { email: u.email, senha: SENHA_DEMO } })).statusCode).toBe(401);
    expect((await injetar({ url: "/api/auth/me", headers: await entrar(u.email, "NovaSenhaPerfil123!") })).statusCode).toBe(200);
  });

  it("preserva o e-mail exclusivo do administrador sem permitir promoção pelo perfil", async () => {
    const admin = await entrar("jadiframe@gmail.com", "SenhaAdminTeste123!");
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers: admin, payload: { nome: "Admin", email: "outro-admin@example.com", senhaAtual: "SenhaAdminTeste123!" } })).statusCode).toBe(403);
    expect((await injetar({ method: "PATCH", url: "/api/auth/perfil", headers, payload: { nome: "Admin falso", email: "jadiframe@gmail.com", senhaAtual: "NovaSenhaPerfil123!" } })).statusCode).toBe(403);
    expect(await db.usuario.count({ where: { papel: "ADMIN" } })).toBe(1);
  });
});
