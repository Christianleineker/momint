import { z } from "zod";

export const idParams = z.object({ id: z.string() });

export const canalSchema = z.enum(["EMAIL", "WHATSAPP"]);

export const abordarBody = z.object({ canal: canalSchema.default("EMAIL") });

export const edicaoMensagemBody = z.object({
  assunto: z.string().nullable().optional(),
  conteudo: z.string().min(1),
});

export const respostaBody = z.object({
  canal: canalSchema,
  conteudo: z.string().min(1),
  quente: z.boolean().default(false),
});
