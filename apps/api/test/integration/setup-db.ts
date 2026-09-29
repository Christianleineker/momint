import { execSync } from "node:child_process";

// Aplica o schema no banco de teste antes da suíte.
export default function setup() {
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "postgresql://momint:momint@localhost:5433/momint_test" },
  });
}
