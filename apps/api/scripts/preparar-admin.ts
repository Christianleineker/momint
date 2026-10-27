import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { EMAIL_ADMIN } from "../src/shared/admin.js";

const db = new PrismaClient();
try {
  const token = randomBytes(32).toString("hex");
  const senhaHash = await bcrypt.hash(randomBytes(48).toString("base64url"), 12);
  const expiraEm = new Date(Date.now() + 24 * 60 * 60_000);
  await db.$transaction(async tx => {
    await tx.usuario.updateMany({ where: { papel: "ADMIN", NOT: { email: EMAIL_ADMIN } }, data: { papel: "GESTOR", versaoSessao: { increment: 1 } } });
    const existente = await tx.usuario.findUnique({ where: { email: EMAIL_ADMIN } });
    let demo = existente ? await tx.cliente.findUnique({ where: { id: existente.clienteId } }) : await tx.cliente.findFirst({ where: { OR: [{ demonstrativo: true }, { nome: "ImperSul Impermeabilizações" }] }, orderBy: { criadoEm: "asc" } });
    if (!demo) demo = await tx.cliente.create({ data: { nome: "Momint · Demonstração", demonstrativo: true } });
    const contaAntiga = demo.contaClienteId;
    await tx.cliente.update({ where: { id: demo.id }, data: { demonstrativo: true, ativo: true, contaClienteId: null } });
    if (contaAntiga && !await tx.cliente.count({ where: { contaClienteId: contaAntiga } })) await tx.contaCliente.delete({ where: { id: contaAntiga } });
    const usuario = await tx.usuario.upsert({ where: { email: EMAIL_ADMIN },
      create: { email: EMAIL_ADMIN, nome: "Administrador Momint", senhaHash, papel: "ADMIN", clienteId: demo.id },
      update: { senhaHash, papel: "ADMIN", ativo: true, versaoSessao: { increment: 1 } },
    });
    await tx.recuperacaoSenha.upsert({ where: { usuarioId: usuario.id },
      create: { usuarioId: usuario.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiraEm },
      update: { tokenHash: createHash("sha256").update(token).digest("hex"), expiraEm, usadaEm: null },
    });
  });
  const url = new URL("/redefinir-senha", process.env.URL_WEB ?? "http://localhost:3000");
  url.hash = new URLSearchParams({ token }).toString();
  const pasta = new URL("../../../.acesso-admin/", import.meta.url);
  await mkdir(pasta, { recursive: true });
  await writeFile(new URL("primeiro-acesso.txt", pasta), `Conta: ${EMAIL_ADMIN}\n\nDefina sua nova senha pelo link de uso único:\n${url}\n\nExpira em: ${expiraEm.toISOString()}\nA senha anterior e as sessões anteriores foram invalidadas.\n`, { mode: 0o600 });
  console.log("Administrador exclusivo preparado. Link de primeiro acesso salvo em .acesso-admin/primeiro-acesso.txt (válido por 24 horas).");
} finally { await db.$disconnect(); }
