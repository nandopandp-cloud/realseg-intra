import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { createSession, loadActor } from "@/server/auth/session";
import type { Ctx } from "@/server/auth/actor";
import { seedReference } from "../../scripts/seed/reference";
import { seedDemo } from "../../scripts/seed/demo";

export type People = Awaited<ReturnType<typeof seedDemo>>;

/** Limpa todas as tabelas e recria referência + demonstração (estado determinístico por arquivo de teste). */
export async function resetDatabase(now = new Date()): Promise<People> {
  const db = getDb();
  const tables = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = tables.rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
  await db.execute(sql`select setval('ticket_number_seq', 1000, false)`);
  await seedReference(db);
  return seedDemo(db, { now });
}

export const testMeta = { requestId: "test-request-0001", ipHash: "iphash-test", userAgent: "vitest" };

/** Cria uma sessão real e retorna o contexto do ator. */
export async function ctxFor(user: { id: string; email: string }): Promise<Ctx> {
  const { token } = await createSession(user.id, { userAgent: "vitest", ipHash: null });
  const { sha256Hex } = await import("@/server/auth/crypto");
  const actor = await loadActor(user.id, sha256Hex(token), user.email, false);
  return { actor, meta: testMeta };
}

/** Monta uma requisição para chamar Route Handlers diretamente. */
export function apiRequest(
  path: string,
  init: { method?: string; json?: unknown; body?: BodyInit; cookie?: string; origin?: string | null; headers?: Record<string, string> } = {},
) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000");
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}

export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

/** Cookie de sessão para um usuário (atalho para testes de API). */
export async function sessionCookie(userId: string) {
  const { token } = await createSession(userId, { userAgent: "vitest", ipHash: null });
  return `rs_session=${token}`;
}
