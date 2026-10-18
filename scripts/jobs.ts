/**
 * Tarefas periódicas (agendar via cron/orquestrador a cada 5 minutos):
 *   - monitor de SLA (alertas de risco, violações, fechamento automático de resolvidos)
 *   - limpeza de sessões expiradas, tokens de redefinição vencidos e janelas de rate limit
 * Uso: pnpm jobs:run
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db/client";
import { logger } from "@/server/logger";
import { purgeExpired } from "@/server/rate-limit";
import { runSlaMonitor } from "@/server/services/tickets";

async function main() {
  const started = Date.now();
  const sla = await runSlaMonitor();
  const db = getDb();
  // Sessões e tokens vencidos há mais de 30 dias não têm mais utilidade (minimização).
  const sessions = await db.execute(sql`delete from sessions where expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days'`);
  const tokens = await db.execute(sql`delete from password_reset_tokens where expires_at < now() - interval '7 days'`);
  await purgeExpired();
  logger.info("jobs.completed", { ms: Date.now() - started, sla, sessionsDeleted: sessions.rowCount, resetLinksDeleted: tokens.rowCount });
}

main()
  .catch((err) => {
    logger.error("jobs.failed", { err });
    process.exitCode = 1;
  })
  .finally(() => closeDb());
