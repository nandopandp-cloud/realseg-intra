import { execSync } from "node:child_process";
import { startEmbeddedPostgres } from "../../scripts/lib/embedded-pg.mjs";

/** Sobe um PostgreSQL 18 real e limpo, aplica as migrações e o encerra ao final. */
export default async function setup() {
  const { url, stop } = await startEmbeddedPostgres({ dir: ".data/pg-test", port: 54321, database: "realseg_test", fresh: true });
  execSync("npx tsx scripts/migrate.ts", { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
  return async () => {
    await stop();
  };
}
