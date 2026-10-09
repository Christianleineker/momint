import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Env } from "../../config/env.js";
import type { Email } from "../../ports/email.js";

export function criarEmail(env: Env): Email {
  if (env.EMAIL_TRANSPORT === "arquivo") {
    if (env.NODE_ENV === "production") throw new Error("Prévia de e-mail não permitida em produção.");
    const pasta = resolve(process.cwd(), ".mailbox");
    return {
      async enviar({ destinatario, assunto, texto }) {
        await mkdir(pasta, { recursive: true });
        await writeFile(resolve(pasta, `${randomUUID()}.txt`), `Para: ${destinatario}\nAssunto: ${assunto}\n\n${texto}`, { encoding: "utf8", mode: 0o600 });
      },
    };
  }
  const transporte = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return {
    async enviar({ destinatario, assunto, texto }) {
      await transporte.sendMail({ from: { name: "Momint", address: env.SMTP_FROM! }, to: destinatario, subject: assunto, text: texto });
    },
  };
}
