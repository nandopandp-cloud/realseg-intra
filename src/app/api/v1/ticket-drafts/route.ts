import { ticketDraftSchema } from "@/lib/validation/forms";
import { authed } from "@/server/http/route";
import { listDrafts, saveDraft } from "@/server/services/tickets";

export const GET = authed({ permission: "ticket:create" }, async ({ actor, meta }) => ({ items: await listDrafts({ actor, meta }) }));
export const POST = authed({ permission: "ticket:create", body: ticketDraftSchema }, async ({ actor, meta, body }) => {
  const d = await saveDraft({ actor, meta }, body);
  return Response.json(d, { status: 201, headers: { "Cache-Control": "no-store" } });
});
