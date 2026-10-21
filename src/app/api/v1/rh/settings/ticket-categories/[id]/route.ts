import type { z } from "zod";
import { ticketCategorySchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveTicketCategory } from "@/server/services/rh/settings";

export const PUT = authed<{ id: string }, z.infer<typeof ticketCategorySchema>>({ permission: "sla:configure", body: ticketCategorySchema }, async ({ actor, meta, params, body }) => {
  await saveTicketCategory({ actor, meta }, parseId(params.id, "Área"), body);
});
