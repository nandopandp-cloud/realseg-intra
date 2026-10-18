// PostgreSQL 18 embarcado (ADR-0002) — somente desenvolvimento e testes.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/**
 * Sobe (ou reaproveita) um cluster PostgreSQL local.
 * @param {{ dir: string, port: number, database: string, fresh?: boolean, user?: string, password?: string }} opts
 */
export async function startEmbeddedPostgres(opts) {
  const user = opts.user ?? "realseg";
  const password = opts.password ?? "realseg";
  const dir = path.resolve(opts.dir);
  if (opts.fresh && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const needsInit = !fs.existsSync(path.join(dir, "PG_VERSION"));

  const server = new EmbeddedPostgres({
    databaseDir: dir,
    user,
    password,
    port: opts.port,
    persistent: true,
    onLog: () => {},
    onError: (m) => {
      const s = String(m);
      if (/ERROR|FATAL|PANIC/.test(s)) process.stderr.write(`[postgres] ${s}\n`);
    },
    postgresFlags: ["-c", "timezone=UTC", "-c", "max_connections=100"],
  });
  if (needsInit) await server.initialise();
  await server.start();

  const admin = new pg.Client({ connectionString: `postgres://${user}:${password}@localhost:${opts.port}/postgres` });
  await admin.connect();
  const exists = await admin.query("select 1 from pg_database where datname = $1", [opts.database]);
  if (exists.rowCount === 0) await admin.query(`create database "${opts.database}"`);
  await admin.end();

  const url = `postgres://${user}:${password}@localhost:${opts.port}/${opts.database}`;
  return { server, url, stop: () => server.stop() };
}
