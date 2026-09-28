// Ponto de entrada: lê a configuração, monta as dependências e sobe o HTTP.
import { carregarEnv } from "./config/env.js";
import { criarApp } from "./app.js";
import { criarContainer, criarRelogio } from "./container.js";
import { criarPrisma } from "./infra/database/prisma.js";
import { criarFontesPublicas } from "./infra/fontes-publicas/index.js";

const env = carregarEnv();
const prisma = criarPrisma();
const container = criarContainer({ prisma, fontes: criarFontesPublicas(env.DATA_MODE), relogio: criarRelogio(env.MOMINT_HOJE) });
const app = await criarApp({ container, jwtSecret: env.JWT_SECRET, logger: env.NODE_ENV !== "test" });

const encerrar = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);

await app.listen({ port: env.PORT, host: "0.0.0.0" });
