import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  OTP_SECRET: z.string().min(32).optional(),
  URL_WEB: z.string().url().default("http://localhost:3000"),
  EMAIL_TRANSPORT: z.enum(["arquivo", "smtp"]).default("arquivo"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  /** mock = fixtures locais; live = APIs públicas reais */
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
  /** Data fixa (YYYY-MM-DD) para demos e testes determinísticos */
  MOMINT_HOJE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
}).superRefine((env, ctx) => {
  if (env.EMAIL_TRANSPORT === "smtp") {
    for (const campo of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const) {
      if (!env[campo]) ctx.addIssue({ code: "custom", path: [campo], message: "Obrigatório para envio SMTP" });
    }
  }
  if (env.NODE_ENV === "production") {
    if (env.EMAIL_TRANSPORT !== "smtp") ctx.addIssue({ code: "custom", path: ["EMAIL_TRANSPORT"], message: "Produção exige envio SMTP" });
    if (!env.URL_WEB.startsWith("https://")) ctx.addIssue({ code: "custom", path: ["URL_WEB"], message: "Produção exige HTTPS" });
  }
});

export type Env = z.infer<typeof schema>;

export function carregarEnv(fonte: NodeJS.ProcessEnv = process.env): Env {
  const r = schema.safeParse(fonte);
  if (!r.success) {
    const campos = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Variáveis de ambiente inválidas — ${campos}`);
  }
  return r.data;
}
