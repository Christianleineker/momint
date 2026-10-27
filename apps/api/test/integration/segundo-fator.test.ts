import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { InjectOptions } from "light-my-request";
import { createHash } from "node:crypto";
import { seed, SENHA_DEMO } from "../../prisma/seed.js";
import { criarApp } from "../../src/app.js";
import { criarContainer, criarRelogio } from "../../src/container.js";
import { fontesMock } from "../../src/infra/fontes-publicas/mock.js";

const db = new PrismaClient();
let app: FastifyInstance;
let agora = new Date();
let endereco = 1;
let sessao = "";
const emails: { destinatario: string; texto: string }[] = [];
let falharEmail = false;
const requisitar = (opcoes: InjectOptions) => app.inject({ ...opcoes, remoteAddress: `127.0.0.${endereco}` });
const cabecalho = (cookie: string) => ({ cookie });
const cookies = (r: { cookies: Array<{ name: string; value: string; maxAge?: number }> }) => r.cookies.filter(c => c.maxAge !== 0).map(c => `${c.name}=${c.value}`).join("; ");
const codigo = () => emails.at(-1)!.texto.match(/é: (\d{6})/)![1];
const avancar = (ms = 60_001) => { agora = new Date(agora.getTime() + ms); };
beforeEach(() => { endereco++; });
beforeAll(async () => {
  await seed(db);
  app = await criarApp({ jwtSecret: "test-2fa", container: criarContainer({ prisma: db, fontes: fontesMock, relogio: criarRelogio("2026-09-30"), agoraAutenticacao: () => agora, segredoOtp: "segredo-isolado-de-teste-com-32-caracteres", email: { enviar: async e => { if (falharEmail) throw new Error("Falha simulada"); emails.push(e); } } }) });
});
afterAll(async () => { await app?.close(); await db.$disconnect(); });
const login = (email = "rafael@impersul.com.br", senha = SENHA_DEMO) => requisitar({ method: "POST", url: "/api/auth/login", payload: { email, senha } });
const confirmarLogin = (cookie: string, valor = codigo()) => requisitar({ method: "POST", url: "/api/auth/login/codigo", headers: cabecalho(cookie), payload: { codigo: valor } });

describe("Primeiro acesso e segundo fator por e-mail", () => {
  it("permite manter a senha inicial uma única vez e oferece o segundo fator", async () => {
    sessao = cookies(await login());
    expect((await requisitar({ url: "/api/auth/me", headers: cabecalho(sessao) })).json().primeiroAcessoPendente).toBe(true);
    const manter = () => requisitar({ method: "POST", url: "/api/auth/primeiro-acesso", headers: cabecalho(sessao), payload: { manterSenha: true } });
    const r = await manter(); expect(r.statusCode).toBe(200); sessao = cookies(r);
    expect(r.json().primeiroAcessoPendente).toBe(false); expect(r.json().oferta2faPendente).toBe(true);
    expect((await manter()).statusCode).toBe(409);
  });

  it("permite trocar a senha recebida e encerra o acesso anterior", async () => {
    const anterior = cookies(await login("carla@impersul.com.br"));
    const dados = { manterSenha: false, senhaAtual: SENHA_DEMO, novaSenha: "NovaSenhaInicial123!" };
    expect((await requisitar({ method: "POST", url: "/api/auth/primeiro-acesso", headers: cabecalho(anterior), payload: { ...dados, senhaAtual: "errada" } })).statusCode).toBe(400);
    const r = await requisitar({ method: "POST", url: "/api/auth/primeiro-acesso", headers: cabecalho(anterior), payload: dados }); expect(r.statusCode).toBe(200);
    expect((await requisitar({ url: "/api/auth/me", headers: cabecalho(anterior) })).statusCode).toBe(401);
    expect((await login("carla@impersul.com.br")).statusCode).toBe(401);
    expect((await login("carla@impersul.com.br", dados.novaSenha)).statusCode).toBe(200);
    const adiar = await requisitar({ method: "POST", url: "/api/auth/2fa/adiar", headers: cabecalho(cookies(r)) }); expect(adiar.statusCode).toBe(200);
    expect((await requisitar({ url: "/api/auth/me", headers: cabecalho(cookies(r)) })).json().oferta2faPendente).toBe(false);
  });

  it("ativa somente após confirmar o e-mail e armazena apenas hashes", async () => {
    const r = await requisitar({ method: "POST", url: "/api/auth/2fa/solicitar", headers: cabecalho(sessao), payload: { ativar: true } });
    expect(r.statusCode).toBe(200); expect(r.body).not.toContain(codigo()); expect(r.body).not.toContain("token");
    expect(emails.at(-1)!.destinatario).toBe("rafael@impersul.com.br");
    const desafio = await db.desafioEmail.findFirstOrThrow({ where: { finalidade: "ATIVAR_2FA" } });
    expect(desafio.codigoHash).not.toBe(codigo()); expect(desafio.codigoHash).not.toBe(createHash("sha256").update(codigo()).digest("hex"));
    expect(desafio.expiraEm.getTime()).toBe(agora.getTime() + 300_000);
    const configuracao = `${sessao}; ${cookies(r)}`;
    const confirmar = (valor: string) => requisitar({ method: "POST", url: "/api/auth/2fa/confirmar", headers: cabecalho(configuracao), payload: { codigo: valor } });
    expect((await confirmar(codigo() === "000000" ? "111111" : "000000")).statusCode).toBe(400);
    expect((await db.desafioEmail.findUniqueOrThrow({ where: { id: desafio.id } })).tentativas).toBe(1);
    const confirmado = await confirmar(codigo()); expect(confirmado.statusCode).toBe(200); sessao = cookies(confirmado);
    expect(confirmado.json().doisFatoresEmail).toBe(true); expect(await db.desafioEmail.count()).toBe(0);
  });

  it("não emite sessão antes do código e consome o desafio uma única vez em paralelo", async () => {
    const r = await login(); expect(r.statusCode).toBe(202); expect(r.json().requerCodigo).toBe(true);
    const pendente = cookies(r);
    expect((await requisitar({ url: "/api/auth/me", headers: cabecalho(pendente) })).statusCode).toBe(401);
    expect((await requisitar({ url: "/api/auth/login/pendente", headers: cabecalho(pendente) })).json().requerCodigo).toBe(true);
    const respostas = await Promise.all([confirmarLogin(pendente), confirmarLogin(pendente)]);
    expect(respostas.map(r => r.statusCode).sort()).toEqual([200, 400]);
    sessao = cookies(respostas.find(r => r.statusCode === 200)!);
    expect((await requisitar({ url: "/api/auth/me", headers: cabecalho(sessao) })).statusCode).toBe(200);
    expect(await db.desafioEmail.count()).toBe(0);
    expect((await requisitar({ method: "PATCH", url: "/api/auth/perfil", headers: cabecalho(sessao), payload: { nome: "Rafael", email: "invasor@example.com", senhaAtual: SENHA_DEMO } })).statusCode).toBe(400);
  });

  it("expira códigos e apaga o desafio depois de cinco erros", async () => {
    avancar(); const expirado = cookies(await login()); const correto = codigo(); avancar(300_001);
    expect((await confirmarLogin(expirado, correto)).statusCode).toBe(400); expect(await db.desafioEmail.count()).toBe(0);
    const limitado = cookies(await login()); const valido = codigo();
    for (let i = 0; i < 5; i++) expect((await confirmarLogin(limitado, valido === "000000" ? "111111" : "000000")).statusCode).toBe(400);
    expect(await db.desafioEmail.count()).toBe(0); expect((await confirmarLogin(limitado, valido)).statusCode).toBe(400);
  });

  it("limita reenvios, invalida o código anterior e falha fechado se o e-mail falhar", async () => {
    avancar(); const antigo = cookies(await login()); const codigoAntigo = codigo();
    expect((await requisitar({ method: "POST", url: "/api/auth/login/reenviar", headers: cabecalho(antigo) })).statusCode).toBe(409);
    avancar(); const novo = await requisitar({ method: "POST", url: "/api/auth/login/reenviar", headers: cabecalho(antigo) }); expect(novo.statusCode).toBe(200);
    const codigoNovo = codigo(); expect((await confirmarLogin(antigo, codigoAntigo)).statusCode).toBe(400);
    const acesso = await confirmarLogin(cookies(novo), codigoNovo); expect(acesso.statusCode).toBe(200); sessao = cookies(acesso);
    falharEmail = true; expect((await login()).statusCode).toBe(503); expect(await db.desafioEmail.count()).toBe(0); falharEmail = false;
  });

  it("exige a senha atual e o código do titular para desativar o segundo fator", async () => {
    const solicitar = (senhaAtual?: string) => requisitar({ method: "POST", url: "/api/auth/2fa/solicitar", headers: cabecalho(sessao), payload: { ativar: false, ...(senhaAtual ? { senhaAtual } : {}) } });
    expect((await solicitar()).statusCode).toBe(400); expect((await solicitar("errada")).statusCode).toBe(400);
    const r = await solicitar(SENHA_DEMO); expect(r.statusCode).toBe(200);
    const confirmado = await requisitar({ method: "POST", url: "/api/auth/2fa/confirmar", headers: cabecalho(`${sessao}; ${cookies(r)}`), payload: { codigo: codigo() } });
    expect(confirmado.statusCode).toBe(200); expect(confirmado.json().doisFatoresEmail).toBe(false);
    expect((await login()).statusCode).toBe(200);
  });
});
