// Servidor isolado para E2E: PostgreSQL embarcado NOVO (porta 54322) + migrações + seed determinístico + Next.
// Modo padrão: `next start` (exige `pnpm build` antes). E2E_DEV=1 usa `next dev`.
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import { startEmbeddedPostgres } from "./lib/embedded-pg.mjs";

const PORT = process.env.E2E_PORT ?? "3100";
const { url, stop } = await startEmbeddedPostgres({ dir: ".data/pg-e2e", port: 54322, database: "realseg_e2e", fresh: true });
fs.rmSync(".data/storage-e2e", { recursive: true, force: true });

const env = {
  ...process.env,
  NODE_ENV: process.env.E2E_DEV === "1" ? "development" : "production",
  APP_ENV: "test",
  APP_URL: `http://localhost:${PORT}`,
  DATABASE_URL: url,
  IP_HASH_SECRET: "e2e-secret-value-only-for-tests",
  STORAGE_DIR: ".data/storage-e2e",
  MAIL_DRIVER: "outbox",
  SESSION_IDLE_MINUTES: "60",
  LOG_LEVEL: "warn",
};
execSync("npx tsx --conditions=react-server scripts/seed/index.ts e2e", { env: { ...env, NODE_ENV: "test" }, stdio: "inherit" });

const args = process.env.E2E_DEV === "1" ? ["next", "dev", "-p", PORT] : ["next", "start", "-p", PORT];
const app = spawn("npx", args, { env, stdio: "inherit" });
const shutdown = async () => {
  app.kill("SIGTERM");
  await stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
app.on("exit", async (code) => {
  await stop();
  process.exit(code ?? 0);
});
