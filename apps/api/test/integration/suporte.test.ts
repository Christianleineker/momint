import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { InjectOptions } from "light-my-request";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";

const db = new PrismaClient();
let app: FastifyInstance;
let admin: { cookie: string };
let visitante: { cookie: string };
let outro: { cookie: string };
let gestor: { cookie: string };
let conversaId = "";
let outraId = "";
let endereco = 1;
let agora = new Date();
beforeEach(() => { endereco++; });
const req = (opcoes: InjectOptions) => app.inject({ ...opcoes, remoteAddress: `127.0.0.${endereco}` });
const mensagem = (conteudo: string) => ({ conteudo, idEnvio: randomUUID() });
const cookie = (r: { cookies: Array<{ name: string; value: string }> }) => ({ cookie: `${r.cookies[0].name}=${r.cookies[0].value}` });
beforeAll(async () => {
  await seed(db);
  const demo = await db.cliente.findFirstOrThrow({ where: { demonstrativo: true } });
  await db.usuario.create({ data: { email: "jadiframe@gmail.com", nome: "Admin Suporte", senhaHash: await bcrypt.hash("AdminSuporte123!", 4), papel: "ADMIN", clienteId: demo.id } });
  app = await criarApp({ jwtSecret: "test-suporte", container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio("2026-09-30"), agoraAutenticacao: () => agora }) });
  admin = cookie(await req({ method: "POST", url: "/api/auth/login", payload: { email: "jadiframe@gmail.com", senha: "AdminSuporte123!" } }));
  gestor = cookie(await req({ method: "POST", url: "/api/auth/login", payload: { email: "gestor@impersul.com.br", senha: SENHA_DEMO } }));
});
afterAll(async () => { await app?.close(); await db.$disconnect(); });

describe("Chat público com atendimento exclusivo do administrador", () => {
  it("inicia conversas sem conta e guarda somente o hash do acesso do navegador", async () => {
    expect((await req({ url: "/api/suporte/conversa" })).json()).toBeNull();
    const r = await req({ method: "POST", url: "/api/suporte/conversa", payload: { nome: "Cliente Visitante", email: "visitante@example.com", assunto: "COMERCIAL", ...mensagem("Quero conhecer o sistema") } });
    expect(r.statusCode).toBe(201); visitante = cookie(r); conversaId = r.json().id;
    expect(r.cookies[0].httpOnly).toBe(true); expect(r.cookies[0].sameSite).toBe("Lax");
    expect(r.body).not.toContain("acessoHash"); expect(r.body).not.toContain(r.cookies[0].value); expect(r.body).not.toContain("idEnvio");
    const banco = await db.conversaSuporte.findUniqueOrThrow({ where: { id: conversaId } });
    expect(banco.acessoHash).toBe(createHash("sha256").update(r.cookies[0].value).digest("hex"));
    const segundo = await req({ method: "POST", url: "/api/suporte/conversa", payload: { nome: "Outro Visitante", assunto: "SUPORTE", ...mensagem("Minha dúvida é particular") } });
    expect(segundo.statusCode).toBe(201); outro = cookie(segundo); outraId = segundo.json().id;
    expect((await req({ url: "/api/suporte/conversa", headers: visitante })).json().id).toBe(conversaId);
    expect((await req({ url: "/api/suporte/conversa", headers: outro })).json().id).toBe(outraId);
    expect((await req({ url: `/api/suporte/conversa/${outraId}`, headers: visitante })).statusCode).toBe(404);
    expect((await req({ url: "/api/suporte/conversa", headers: { cookie: "momint_suporte=forjado" } })).json()).toBeNull();
  });

  it("restringe a listagem e as respostas a ADMIN, incluindo administradores removidos do banco", async () => {
    expect((await req({ url: "/api/admin/suporte" })).statusCode).toBe(401);
    expect((await req({ url: "/api/admin/suporte", headers: gestor })).statusCode).toBe(403);
    expect((await req({ method: "POST", url: `/api/admin/suporte/${conversaId}/mensagens`, headers: gestor, payload: mensagem("Resposta indevida") })).statusCode).toBe(403);
    expect((await req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: { ...mensagem("Falso admin"), autor: "ADMIN" } })).statusCode).toBe(400);
    const lista = (await req({ url: "/api/admin/suporte", headers: admin })).json(); expect(lista.conversas).toHaveLength(2); expect(lista.naoLidas).toBe(2); expect(JSON.stringify(lista)).not.toContain("acessoHash");
    await db.usuario.update({ where: { email: "jadiframe@gmail.com" }, data: { papel: "GESTOR", versaoSessao: { increment: 1 } } });
    expect((await req({ method: "POST", url: `/api/admin/suporte/${conversaId}/mensagens`, headers: admin, payload: mensagem("Cargo removido") })).statusCode).toBe(401);
    await db.usuario.update({ where: { email: "jadiframe@gmail.com" }, data: { papel: "ADMIN", versaoSessao: { increment: 1 } } });
    admin = cookie(await req({ method: "POST", url: "/api/auth/login", payload: { email: "jadiframe@gmail.com", senha: "AdminSuporte123!" } }));
  });

  it("entrega respostas somente à conversa correta e não duplica mensagens em reenvios", async () => {
    const dados = mensagem("Olá! Posso apresentar o Momint para você.");
    const responder = () => req({ method: "POST", url: `/api/admin/suporte/${conversaId}/mensagens`, headers: admin, payload: dados });
    expect((await responder()).statusCode).toBe(200); expect((await responder()).statusCode).toBe(200);
    const c = (await req({ url: "/api/suporte/conversa", headers: visitante })).json(); expect(c.mensagens).toHaveLength(2); expect(c.pendentesVisitante).toBe(1); expect(c.mensagens[1].autor).toBe("ADMIN"); expect(c.mensagens[1].nomeAutor).toBe("Admin Suporte");
    const outra = (await req({ url: "/api/suporte/conversa", headers: outro })).json(); expect(outra.mensagens).toHaveLength(1); expect(outra.pendentesVisitante).toBe(0);
    const fala = mensagem("Obrigado, quero agendar uma demonstração.");
    const respostas = await Promise.all([req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: fala }), req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: fala })]);
    expect(respostas.every(r => r.statusCode === 200)).toBe(true);
    expect(await db.mensagemSuporte.count({ where: { conversaId, idEnvio: fala.idEnvio } })).toBe(1);
    expect((await req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: { ...fala, conteudo: "Texto diferente" } })).statusCode).toBe(400);
  });

  it("marca somente mensagens já exibidas e preserva novos avisos concorrentes", async () => {
    const c = (await req({ url: "/api/suporte/conversa", headers: visitante })).json();
    expect((await req({ method: "POST", url: "/api/suporte/lida", headers: visitante, payload: { ate: c.mensagens[1].id } })).statusCode).toBe(200);
    expect((await req({ url: "/api/suporte/conversa", headers: visitante })).json().pendentesVisitante).toBe(0);
    expect((await req({ method: "POST", url: "/api/suporte/lida", headers: outro, payload: { ate: c.mensagens[1].id } })).statusCode).toBe(400);
    agora = new Date(agora.getTime() + 1000);
    await req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: mensagem("Nova mensagem depois da leitura") });
    await req({ method: "POST", url: `/api/admin/suporte/${conversaId}/lida`, headers: admin, payload: { ate: c.mensagens[2].id } });
    expect((await db.conversaSuporte.findUniqueOrThrow({ where: { id: conversaId } })).pendentesAdmin).toBe(1);
  });

  it("pagina o histórico, isola os cursores e permite encerrar e reabrir atendimento", async () => {
    const tempo = new Date(agora.getTime() + 1000);
    await db.mensagemSuporte.createMany({ data: Array.from({ length: 110 }, (_, i) => ({ conversaId, autor: "VISITANTE" as const, nomeAutor: "Visitante", conteudo: `Histórico ${i}`, idEnvio: randomUUID(), criadoEm: new Date(tempo.getTime() + i * 1000) })) });
    const recente = (await req({ url: "/api/suporte/conversa", headers: visitante })).json(); expect(recente.mensagens).toHaveLength(100); expect(recente.temAnteriores).toBe(true);
    const anteriores = (await req({ url: `/api/suporte/conversa?antes=${recente.mensagens[0].id}`, headers: visitante })).json(); expect(anteriores.mensagens.length).toBeGreaterThan(0); expect(anteriores.temAnteriores).toBe(false);
    expect((await req({ url: `/api/suporte/conversa?antes=${recente.mensagens[0].id}`, headers: outro })).statusCode).toBe(400);
    expect((await req({ method: "PATCH", url: `/api/admin/suporte/${conversaId}`, headers: admin, payload: { encerrada: true } })).statusCode).toBe(200);
    expect((await req({ url: "/api/suporte/conversa", headers: visitante })).json().encerrada).toBe(true);
    expect((await req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: mensagem("Preciso de mais ajuda") })).statusCode).toBe(200);
    expect((await req({ url: "/api/suporte/conversa", headers: visitante })).json().encerrada).toBe(false);
    expect((await req({ url: "/api/admin/suporte?busca=Cliente%20Visitante", headers: admin })).json().conversas).toHaveLength(1);
  });

  it("rejeita mensagens vazias, grandes demais e cookies expirados", async () => {
    for (const texto of [" ", "x".repeat(2001)]) expect((await req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: mensagem(texto) })).statusCode).toBe(400);
    expect((await req({ method: "POST", url: "/api/suporte/mensagens", payload: mensagem("Sem acesso") })).statusCode).toBe(404);
    agora = new Date(agora.getTime() + 31 * 86_400_000);
    expect((await req({ url: "/api/suporte/conversa", headers: visitante })).json()).toBeNull();
    expect((await req({ method: "POST", url: "/api/suporte/mensagens", headers: visitante, payload: mensagem("Acesso expirado") })).statusCode).toBe(404);
  });
});
