import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";
import { EMAIL_ADMIN } from "../../src/shared/admin.js";

const db = new PrismaClient();
let app: FastifyInstance;
const senha = "SenhaInicialTeste123!";
let admin: { cookie: string };
let clienteId: string;
let sistemaId: string;
let segundoSistemaId: string;
let primeiro: { cookie: string };
let segundo: { cookie: string };
const novoSistema = (sufixo: string) => ({ nome: `Sistema ${sufixo}`, plano: "mensal", responsavel: `Gestor ${sufixo}`, email: `gestor-${sufixo}@cliente.example`, senha });
async function login(email: string, senhaLogin = senha) {
  const r = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, senha: senhaLogin } });
  expect(r.statusCode).toBe(200);
  return { cookie: `${r.cookies[0].name}=${r.cookies[0].value}` };
}
beforeAll(async () => {
  await seed(db);
  const demo = await db.cliente.findFirstOrThrow({ where: { demonstrativo: true } });
  await db.usuario.create({ data: { email: EMAIL_ADMIN, nome: "Administrador", clienteId: demo.id, papel: "ADMIN", senhaHash: await bcrypt.hash(senha, 4) } });
  app = await criarApp({ container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio("2026-09-30") }), jwtSecret: "test-admin" });
  admin = await login(EMAIL_ADMIN.toUpperCase());
});
afterAll(async () => { await app?.close(); await db.$disconnect(); });

describe("Administrador exclusivo e gestão de clientes", () => {
  it("restringe todo o painel ao admin, inclusive gestores do demonstrativo", async () => {
    expect((await app.inject({ url: "/api/admin/clientes" })).statusCode).toBe(401);
    const gestor = await login("gestor@impersul.com.br", SENHA_DEMO);
    for (const method of ["GET", "POST", "DELETE"] as const) {
      expect((await app.inject({ method, url: method === "DELETE" ? "/api/admin/clientes/falso" : "/api/admin/clientes", headers: gestor, payload: method === "GET" ? undefined : {} })).statusCode).toBe(403);
    }
    expect(await db.usuario.count({ where: { papel: "ADMIN" } })).toBe(1);
    const atual = await db.usuario.findUniqueOrThrow({ where: { email: "gestor@impersul.com.br" } });
    await expect(db.usuario.update({ where: { id: atual.id }, data: { papel: "ADMIN" } })).rejects.toThrow();
  });

  it("cria cliente e primeiro sistema atomicamente, sem dados da demonstração", async () => {
    const r = await app.inject({ method: "POST", url: "/api/admin/clientes", headers: admin, payload: { nome: "Cliente Teste", sistema: novoSistema("um") } });
    expect(r.statusCode).toBe(201); clienteId = r.json().id;
    primeiro = await login("gestor-um@cliente.example");
    const perfil = (await app.inject({ url: "/api/auth/me", headers: primeiro })).json();
    expect(perfil.papel).toBe("GESTOR"); expect(perfil.cliente.demonstrativo).toBe(false); sistemaId = perfil.cliente.id;
    expect((await app.inject({ url: "/api/leads", headers: primeiro })).json()).toEqual([]);
    expect((await app.inject({ url: "/api/abordagens/fila", headers: primeiro })).json()).toEqual([]);
    expect((await app.inject({ url: "/api/reunioes", headers: primeiro })).json()).toEqual([]);
    expect((await app.inject({ url: "/api/radar", headers: primeiro })).json()).toEqual([]);
    const d = (await app.inject({ url: "/api/dashboard", headers: primeiro })).json();
    expect(d.metricas.reunioesMes).toBe(0); expect(d.ultimosLeads).toEqual([]);
    const painel = (await app.inject({ url: "/api/admin/clientes", headers: admin })).json();
    expect(JSON.stringify(painel)).not.toContain("senhaHash");
    expect(painel.clientes.flatMap((c: { sistemas: { id: string }[] }) => c.sistemas).map((s: { id: string }) => s.id)).not.toContain((await db.cliente.findFirstOrThrow({ where: { demonstrativo: true } })).id);
    const antes = await db.contaCliente.count();
    expect((await app.inject({ method: "POST", url: "/api/admin/clientes", headers: admin, payload: { nome: "Duplicado", sistema: novoSistema("um") } })).statusCode).toBe(409);
    expect(await db.contaCliente.count()).toBe(antes);
  });

  it("permite vários sistemas por cliente com configurações e equipes independentes", async () => {
    const r = await app.inject({ method: "POST", url: `/api/admin/clientes/${clienteId}/sistemas`, headers: admin, payload: novoSistema("dois") });
    expect(r.statusCode).toBe(201); segundoSistemaId = r.json().id;
    segundo = await login("gestor-dois@cliente.example");
    expect((await app.inject({ method: "POST", url: "/api/usuarios", headers: primeiro, payload: { nome: "Atendente", email: "atendente@cliente.example", senha, papel: "ATENDENTE", clienteId: segundoSistemaId } })).statusCode).toBe(200);
    const equipe1 = (await app.inject({ url: "/api/configuracoes", headers: primeiro })).json();
    const equipe2 = (await app.inject({ url: "/api/configuracoes", headers: segundo })).json();
    expect(equipe1.usuarios).toHaveLength(2); expect(equipe2.usuarios).toHaveLength(1);
    const atendente = await db.usuario.findUniqueOrThrow({ where: { email: "atendente@cliente.example" } });
    expect(atendente.clienteId).toBe(sistemaId);
    expect((await app.inject({ method: "PATCH", url: `/api/usuarios/${atendente.id}`, headers: segundo, payload: { ativo: false } })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: "/api/usuarios", headers: primeiro, payload: { nome: "Admin falso", email: "falso@cliente.example", senha, papel: "ADMIN" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "PATCH", url: `/api/usuarios/${atendente.id}`, headers: primeiro, payload: { papel: "ADMIN" } })).statusCode).toBe(400);
    const cookieAtendente = await login(atendente.email);
    expect((await app.inject({ method: "POST", url: "/api/usuarios", headers: cookieAtendente, payload: { nome: "Outro", email: "outro@cliente.example", senha, papel: "VENDEDOR" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "PUT", url: "/api/configuracoes", headers: primeiro, payload: { vozMarca: "direto", assinaturaEmail: "Só sistema um", modoOperacao: "COPILOTO", calendarioProvedor: null, calendarioConectado: false } })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/configuracoes", headers: segundo })).json().cliente.assinaturaEmail).toBeNull();
    const painel = (await app.inject({ url: "/api/admin/clientes", headers: admin })).json();
    expect(painel.clientes.find((c: { id: string }) => c.id === clienteId).sistemas).toHaveLength(2);
    expect(painel.metricas.clientes).toBe(2); expect(painel.metricas.sistemasVendidos).toBe(3);
  });

  it("suspende e reativa somente o sistema escolhido sem revalidar cookies antigos", async () => {
    expect((await app.inject({ method: "PATCH", url: `/api/admin/sistemas/${sistemaId}`, headers: admin, payload: { ativo: false } })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/auth/me", headers: primeiro })).statusCode).toBe(401);
    expect((await app.inject({ url: "/api/auth/me", headers: segundo })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "gestor-um@cliente.example", senha } })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: `/api/admin/sistemas/${sistemaId}`, headers: admin, payload: { ativo: true } })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/auth/me", headers: primeiro })).statusCode).toBe(401);
    primeiro = await login("gestor-um@cliente.example");
  });

  it("exige confirmação para excluir, revoga todos os acessos e protege a demonstração", async () => {
    expect((await app.inject({ method: "DELETE", url: `/api/admin/clientes/${clienteId}`, headers: admin, payload: { confirmacao: "errado" } })).statusCode).toBe(409);
    expect((await app.inject({ url: "/api/auth/me", headers: primeiro })).statusCode).toBe(200);
    expect((await app.inject({ method: "DELETE", url: `/api/admin/clientes/${clienteId}`, headers: admin, payload: { confirmacao: "Cliente Teste" } })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/auth/me", headers: primeiro })).statusCode).toBe(401);
    expect((await app.inject({ url: "/api/auth/me", headers: segundo })).statusCode).toBe(401);
    expect((await app.inject({ url: "/api/auth/me", headers: admin })).statusCode).toBe(200);
    const excluido = await db.contaCliente.findUniqueOrThrow({ where: { id: clienteId } });
    expect(excluido.excluidoEm).not.toBeNull();
    expect((await app.inject({ method: "POST", url: `/api/admin/clientes/${clienteId}/sistemas`, headers: admin, payload: novoSistema("tres") })).statusCode).toBe(404);
    expect((await app.inject({ url: "/api/admin/clientes", headers: admin })).json().metricas.sistemasVendidos).toBe(1);
    const demo = await db.cliente.findFirstOrThrow({ where: { demonstrativo: true } });
    expect((await app.inject({ method: "PATCH", url: `/api/admin/sistemas/${demo.id}`, headers: admin, payload: { ativo: false } })).statusCode).toBe(404);
  });

});
