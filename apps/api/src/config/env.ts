import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  /** mock = fixtures locais; live = APIs públicas reais */
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
  /** Data fixa (YYYY-MM-DD) para demos e testes determinísticos */
  MOMINT_HOJE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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
