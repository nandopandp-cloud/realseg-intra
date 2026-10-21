import type { z } from "zod";
import { ticketCategorySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveTicketCategory } from "@/server/services/rh/settings";

export const POST = authed<Record<string, string>, z.infer<typeof ticketCategorySchema>>({ permission: "sla:configure", body: ticketCategorySchema }, async ({ actor, meta, body }) => {
  const r = await saveTicketCategory({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
