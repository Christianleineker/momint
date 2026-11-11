import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";
import { EMAIL_ADMIN } from "../../src/shared/admin.js";
import { limparUsuariosExcetoAdmin } from "../../src/modules/auth/limpar-usuarios.js";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const db = new PrismaClient();
let app: FastifyInstance;
let outraInstancia: FastifyInstance;
let agora = new Date("2026-11-10T12:00:00Z");
const email = "gestor@impersul.com.br";
const criar = () => criarApp({ jwtSecret: "teste", container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio(), agoraAutenticacao: () => agora }) });
const login = (senha = SENHA_DEMO, endereco = email, instancia = app) => instancia.inject({ method: "POST", url: "/api/auth/login", payload: { email: endereco, senha } });

beforeAll(async () => { await seed(db); app = await criar(); outraInstancia = await criar(); });
afterAll(async () => { await app?.close(); await outraInstancia?.close(); await db.$disconnect(); });

describe("Bloqueio após três erros consecutivos", () => {
  it("bloqueia por 30 segundos entre instâncias e normaliza o e-mail", async () => {
    expect((await login("errada")).statusCode).toBe(401);
    expect((await login("errada", ` ${email.toUpperCase()} `, outraInstancia)).statusCode).toBe(401);
    const terceira = await login("errada");
    expect(terceira.statusCode).toBe(429);
    expect(terceira.json()).toMatchObject({ codigo: "LOGIN_BLOQUEADO", tentarNovamenteEm: 30 });
    expect(terceira.headers["retry-after"]).toBe("30");
    expect((await login(SENHA_DEMO, email, outraInstancia)).statusCode).toBe(429);
    // Nova instância não perde o bloqueio persistido no banco.
    await outraInstancia.close(); outraInstancia = await criar();
    agora = new Date(agora.getTime() + 29_000);
    expect((await login(SENHA_DEMO, email, outraInstancia)).json().tentarNovamenteEm).toBe(1);
    agora = new Date(agora.getTime() + 1000);
    expect((await login()).statusCode).toBe(200);
  });

  it("zera a sequência após acerto e após término do bloqueio; isola contas", async () => {
    expect((await login("errada")).statusCode).toBe(401);
    expect((await login("errada")).statusCode).toBe(401);
    expect((await login()).statusCode).toBe(200);
    expect((await login("errada")).statusCode).toBe(401);
    expect((await login("errada")).statusCode).toBe(401);
    expect((await login("errada")).statusCode).toBe(429);
    expect((await login(SENHA_DEMO, "rafael@impersul.com.br")).statusCode).toBe(200);
    agora = new Date(agora.getTime() + 30_000);
    expect((await login("errada")).statusCode).toBe(401);
    expect((await login()).statusCode).toBe(200);
  });

  it("serializa erros concorrentes sem permitir login durante o bloqueio", async () => {
    const respostas = await Promise.all(Array.from({ length: 5 }, (_, i) => login("errada", email, i % 2 ? outraInstancia : app)));
    expect(respostas.map(r => r.statusCode).sort()).toEqual([401, 401, 429, 429, 429]);
    expect((await login()).statusCode).toBe(429);
    agora = new Date(agora.getTime() + 30_000);
    expect((await login()).statusCode).toBe(200);
  });

  it("limita contas inexistentes sem armazenar o e-mail legível", async () => {
    const endereco = "inexistente@example.com";
    expect((await login("x", endereco)).statusCode).toBe(401);
    expect((await login("x", endereco)).statusCode).toBe(401);
    expect((await login("x", endereco)).statusCode).toBe(429);
    expect(JSON.stringify(await db.tentativaLogin.findMany())).not.toContain(endereco);
  });
});

describe("Unicidade de e-mail e limpeza pontual", () => {
  it("recusa senha atual e histórica na recuperação sem consumir o link", async () => {
    const u = await db.usuario.findUniqueOrThrow({ where: { email: "rafael@impersul.com.br" } });
    const anterior = "SenhaAnterior123!";
    const atual = "SenhaAtual123456!";
    await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(anterior, 4) } });
    // Alterações pelo admin/perfil também entram no histórico pelo trigger do banco.
    await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(atual, 4) } });
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.recuperacaoSenha.create({ data: { usuarioId: u.id, tokenHash, expiraEm: new Date(agora.getTime() + 60_000) } });
    for (const senha of [atual, anterior]) {
      const resposta = await app.inject({ method: "POST", url: "/api/auth/redefinir-senha", payload: { token, senha } });
      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().erro).toContain("não pode usar uma senha antiga");
      expect((await db.recuperacaoSenha.findUniqueOrThrow({ where: { tokenHash } })).usadaEm).toBeNull();
      expect((await db.usuario.findUniqueOrThrow({ where: { id: u.id } })).versaoSessao).toBe(u.versaoSessao);
    }
    expect((await app.inject({ method: "POST", url: "/api/auth/redefinir-senha", payload: { token, senha: "SenhaInedita12345!" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/api/auth/redefinir-senha", payload: { token, senha: "OutraSenha12345!" } })).json().codigo).toBe("LINK_RECUPERACAO_INVALIDO");
  });

  it("recusa e-mail duplicado e cadastros concorrentes", async () => {
    const resposta = await login();
    const headers = { cookie: `${resposta.cookies[0].name}=${resposta.cookies[0].value}` };
    const dados = { nome: "Novo membro", email: ` ${email.toUpperCase()} `, senha: "SenhaNovaTeste123!", papel: "VENDEDOR" };
    const duplicado = await app.inject({ method: "POST", url: "/api/usuarios", headers, payload: dados });
    expect(duplicado.statusCode).toBe(409); expect(duplicado.json().erro).toContain("E-mail já cadastrado");
    const criacoes = await Promise.all([app, outraInstancia].map(instancia => instancia.inject({ method: "POST", url: "/api/usuarios", headers, payload: { ...dados, email: "concorrente@example.com" } })));
    expect(criacoes.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(await db.usuario.count({ where: { email: "concorrente@example.com" } })).toBe(1);
    const usuario = await db.usuario.findUniqueOrThrow({ where: { email } });
    await expect(db.usuario.update({ where: { id: usuario.id }, data: { email: email.toUpperCase() } })).rejects.toThrow();
  });

  it("aborta sem admin; apaga outros usuários preservando senha, sessão e operação do admin", async () => {
    const quantidade = await db.usuario.count();
    await expect(limparUsuariosExcetoAdmin(db)).rejects.toThrow("Nenhuma conta foi removida");
    expect(await db.usuario.count()).toBe(quantidade);
    const gestor = await db.usuario.findUniqueOrThrow({ where: { email } });
    const admin = await db.usuario.create({ data: { clienteId: gestor.clienteId, nome: "Administrador", email: EMAIL_ADMIN, senhaHash: gestor.senhaHash, papel: "ADMIN" } });
    const totalLeads = await db.lead.count();
    expect(await limparUsuariosExcetoAdmin(db)).toBe(quantidade);
    expect(await db.usuario.findMany()).toEqual([admin]);
    expect(await db.lead.count()).toBe(totalLeads);
    expect((await login(SENHA_DEMO, EMAIL_ADMIN)).statusCode).toBe(200);
    expect(await limparUsuariosExcetoAdmin(db)).toBe(0);
  });
});
