import pg from "pg";

/** Acesso direto à base E2E apenas para preparar cenários (ex.: expirar sessão) e ler o outbox de e-mail. */
export const E2E_DB = "postgres://realseg:realseg@localhost:54322/realseg_e2e";

export async function sql<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query<T>(text, params)).rows;
  } finally {
    await c.end();
  }
}
