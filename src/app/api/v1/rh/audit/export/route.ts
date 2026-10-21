import { z } from "zod";
import { authed } from "@/server/http/route";
import { AUDIT_GROUPS, auditCsv } from "@/server/services/rh/audit-log";

const query = z.object({
  grupo: z.enum(Object.keys(AUDIT_GROUPS) as [keyof typeof AUDIT_GROUPS, ...Array<keyof typeof AUDIT_GROUPS>]).optional().catch(undefined),
  quem: z.string().max(100).optional(),
  id: z.string().max(80).optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
});

export const GET = authed<Record<string, string>, undefined, z.infer<typeof query>>({ permission: "audit:read", query }, async ({ actor, meta, query: q }) => {
  const r = await auditCsv({ actor, meta }, { group: q.grupo, actor: q.quem, entityId: q.id, from: q.de, to: q.ate });
  return new Response(r.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${r.filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
