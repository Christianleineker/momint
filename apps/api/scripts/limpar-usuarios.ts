import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { limparUsuariosExcetoAdmin } from "../src/modules/auth/limpar-usuarios.js";
import { EMAIL_ADMIN } from "../src/shared/admin.js";

const db = new PrismaClient();
try {
  const removidos = await limparUsuariosExcetoAdmin(db);
  console.log(`${removidos} conta(s) removida(s). Mantido somente ${EMAIL_ADMIN}.`);
} finally {
  await db.$disconnect();
}
