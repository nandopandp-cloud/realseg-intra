import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "../env";

export type Database = NodePgDatabase<typeof schema>;
/** Transação ou conexão — serviços aceitam ambos para compor operações atômicas. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __realsegPool?: Pool; __realsegDb?: Database };

function createPool() {
  return new Pool({
    connectionString: env().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    application_name: "realseg-intranet",
  });
}

export function getDb(): Database {
  if (!globalForDb.__realsegDb) {
    const pool = globalForDb.__realsegPool ?? createPool();
    globalForDb.__realsegPool = pool;
    globalForDb.__realsegDb = drizzle(pool, { schema, casing: "snake_case" });
  }
  return globalForDb.__realsegDb;
}

/** Usado por testes e scripts para encerrar conexões. */
export async function closeDb() {
  await globalForDb.__realsegPool?.end();
  globalForDb.__realsegPool = undefined;
  globalForDb.__realsegDb = undefined;
}

export { schema };
