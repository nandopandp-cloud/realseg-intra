import { timingSafeEqual } from "node:crypto";
import { logger } from "@/server/logger";
import { runDailyMaintenance } from "@/server/jobs/maintenance";

/**
 * Chamado pelo Vercel Cron (vercel.json → "crons"), 1x por dia. A Vercel envia
 * `Authorization: Bearer <CRON_SECRET>`; sem o segredo configurado a rota não existe (404).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 401 });
  try {
    const result = await runDailyMaintenance();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("jobs.failed", { err });
    return Response.json({ error: "falha na manutenção" }, { status: 500 });
  }
}
