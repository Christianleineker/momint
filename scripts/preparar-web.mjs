// Compila apenas quando o código ou as dependências mudaram.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(raiz, "apps/web");
const hash = createHash("sha256");
function incluir(caminho) {
  for (const item of readdirSync(caminho, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const arquivo = join(caminho, item.name);
    if (item.isDirectory()) incluir(arquivo);
    else hash.update(arquivo).update(readFileSync(arquivo));
  }
}
incluir(join(web, "src"));
incluir(join(web, "public"));
for (const arquivo of ["package.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs"]) hash.update(readFileSync(join(web, arquivo)));
hash.update(readFileSync(join(raiz, "package-lock.json")));
hash.update(process.version).update(process.env.API_URL ?? "http://localhost:4000");
const assinatura = hash.digest("hex");
const marcador = join(web, ".next/momint-build-hash");
if (!process.argv.includes("--force") && existsSync(join(web, ".next/BUILD_ID")) && existsSync(marcador) && readFileSync(marcador, "utf8") === assinatura) {
  console.log("Interface compilada e atualizada.");
} else {
  console.log("Compilando interface para navegação rápida...");
  const resultado = spawnSync(process.execPath, [join(raiz, "node_modules/next/dist/bin/next"), "build"], { cwd: web, stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
  writeFileSync(marcador, assinatura);
}
