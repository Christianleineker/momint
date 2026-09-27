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
