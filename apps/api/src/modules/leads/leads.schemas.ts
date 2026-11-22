import { z } from "zod";
import { ESTAGIOS } from "../../domain/lead/estados.js";

export const idParams = z.object({ id: z.string() });

export const moverEstagioBody = z.object({
  estagio: z.enum(ESTAGIOS),
  motivo: z.string().optional(),
});

export const qualificacaoBody = z
  .object({ necessidade: z.boolean(), momento: z.boolean(), encaixe: z.boolean(), qualificacaoForcada: z.boolean() })
  .partial();

export const donoBody = z.object({ donoId: z.string() });

const vazioComoAusente = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Contato cadastrado pelo time de vendas: nome e ao menos um canal (e-mail ou telefone). */
export const contatoBody = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do contato").max(120),
    cargo: z.preprocess(vazioComoAusente, z.string().trim().max(80).optional()),
    email: z.preprocess(vazioComoAusente, z.string().trim().toLowerCase().email("E-mail inválido").max(254).optional()),
    telefone: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/\D/g, "") || undefined : v),
      z.string().min(10, "Informe o telefone com DDD").max(11, "Telefone inválido").optional(),
    ),
  })
  .refine((c) => c.email || c.telefone, { message: "Informe o e-mail ou o telefone do contato" });
