// Postgres local sem Docker (fallback): mesmo usuário/porta do docker-compose.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dir = new URL("../.pgdata", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "momint", password: "momint", port: 5433, persistent: true });
const novo = !existsSync(dir);
if (novo) await pg.initialise();
await pg.start();
if (novo) {
  await pg.createDatabase("momint");
  await pg.createDatabase("momint_test");
}
console.log("Postgres local em localhost:5433 (Ctrl+C para parar)");
const parar = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
