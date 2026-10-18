// Sobe o PostgreSQL de desenvolvimento em primeiro plano. Ctrl+C encerra com segurança.
import { startEmbeddedPostgres } from "./lib/embedded-pg.mjs";

const port = Number(process.env.DEV_DB_PORT ?? 54320);
const { url, stop } = await startEmbeddedPostgres({ dir: ".data/pg-dev", port, database: "realseg" });
console.log(`PostgreSQL de desenvolvimento pronto em ${url.replace(/:[^:@/]+@/, ":***@")}`);
console.log("Mantenha este terminal aberto. Ctrl+C para encerrar.");

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  await stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
