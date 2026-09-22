import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://momint:momint@localhost:5433/momint_test",
      JWT_SECRET: "test",
      MOMINT_HOJE: "2026-09-30",
    },
    globalSetup: ["./test/integration/setup-db.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
