import { authed, parseId } from "@/server/http/route";
import { readingReportCsv } from "@/server/services/rh/announcements";

/** Relatório de leitura/ciência em CSV (abre no Excel). */
export const GET = authed<{ id: string }>({ permission: "report:export" }, async ({ actor, meta, params }) => {
  const r = await readingReportCsv({ actor, meta }, parseId(params.id, "Comunicado"));
  return new Response(r.csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${r.filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
});
