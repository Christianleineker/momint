import { z } from "zod";

export const idParams = z.object({ id: z.string() });

export const agendarBody = z.object({
  inicio: z.coerce.date(),
  duracaoMin: z.number().int().min(15).max(240).default(45),
});

export const statusReuniaoBody = z.object({ status: z.enum(["REALIZADA", "CANCELADA", "NO_SHOW"]) });
