import { sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { rateLimits } from "./db/schema";
import { AppError } from "./errors";

export type RateLimitResult = { allowed: boolean; count: number; resetAt: Date };

/**
 * Janela fixa persistida no PostgreSQL (funciona com várias instâncias).
 * Incremento atômico via INSERT … ON CONFLICT.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const [row] = await getDb()
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: sql`now() + make_interval(secs => ${windowSeconds})` })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} <= now() THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });
  return { allowed: row.count <= limit, count: row.count, resetAt: row.resetAt };
}

/** Consulta sem incrementar. */
export async function peek(key: string, limit: number): Promise<RateLimitResult> {
  const rows = await getDb().select().from(rateLimits).where(sql`${rateLimits.key} = ${key} AND ${rateLimits.resetAt} > now()`);
  const row = rows[0];
  if (!row) return { allowed: true, count: 0, resetAt: new Date() };
  return { allowed: row.count < limit, count: row.count, resetAt: row.resetAt };
}

export async function reset(key: string) {
  await getDb().delete(rateLimits).where(sql`${rateLimits.key} = ${key}`);
}

export async function enforce(key: string, limit: number, windowSeconds: number, message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.") {
  const r = await hit(key, limit, windowSeconds);
  if (!r.allowed) {
    throw new AppError("RATE_LIMITED", message, { retryAfterSeconds: Math.max(1, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000)) });
  }
}

/** Limpeza periódica (job). */
export async function purgeExpired() {
  await getDb().delete(rateLimits).where(sql`${rateLimits.resetAt} < now() - interval '1 day'`);
}
