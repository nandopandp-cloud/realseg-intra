import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { logger } from "../logger";
import { purgeExpired } from "../rate-limit";
import { runSlaMonitor } from "../services/tickets";
import { publishDueAnnouncements } from "../services/rh/announcements";

/**
 * Manutenção diária (docs/operacao/otimizacao-de-custos.md §7): uma única execução por dia acorda o banco uma vez,
 * em vez de um job a cada poucos minutos manter o Neon ligado 24 h.
 * - Monitor de SLA (violações e fechamento automático de resolvidos há mais de 7 dias).
 * - Comunicados agendados cuja data chegou: status "publicado" e aviso ao público.
 * - Limpeza: sessões expiradas/revogadas há 30 dias, links de redefinição vencidos há 7 dias, janelas de rate limit.
 */
export async function runDailyMaintenance() {
  const started = Date.now();
  const sla = await runSlaMonitor();
  const announcementsPublished = await publishDueAnnouncements();
  const db = getDb();
  const sessions = await db.execute(sql`delete from sessions where expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days'`);
  const resets = await db.execute(sql`delete from password_reset_tokens where expires_at < now() - interval '7 days'`);
  await purgeExpired();
  const result = { ms: Date.now() - started, sla, announcementsPublished, sessionsDeleted: sessions.rowCount ?? 0, resetLinksDeleted: resets.rowCount ?? 0 };
  logger.info("jobs.completed", result);
  return result;
}
