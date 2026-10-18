// Sobe PostgreSQL de dev + migrações + Next.js em um único comando (Ctrl+C encerra ambos).
import { spawn, execSync } from "node:child_process";
import { startEmbeddedPostgres } from "./lib/embedded-pg.mjs";

const { stop } = await startEmbeddedPostgres({ dir: ".data/pg-dev", port: 54320, database: "realseg" });
execSync("pnpm db:migrate", { stdio: "inherit" });
const next = spawn("pnpm", ["next", "dev"], { stdio: "inherit" });
const shutdown = async () => {
  next.kill("SIGINT");
  await stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
next.on("exit", shutdown);
