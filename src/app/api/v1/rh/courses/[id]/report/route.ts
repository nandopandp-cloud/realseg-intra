import { authed, parseId } from "@/server/http/route";
import { courseReportCsv } from "@/server/services/rh/courses";

export const GET = authed<{ id: string }>({ permission: "report:export" }, async ({ actor, meta, params }) => {
  const r = await courseReportCsv({ actor, meta }, parseId(params.id, "Curso"));
  return new Response(r.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${r.filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
