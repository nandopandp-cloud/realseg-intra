import { z } from "zod";
import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { cancelMyTicket } from "@/server/services/tickets";

const body = z.object({ reason: z.string().trim().max(500).optional() });
export const POST = authed<{ number: string }, z.infer<typeof body>>({ permission: "ticket:comment:own", body }, async ({ actor, meta, params, body }) => {
  await cancelMyTicket({ actor, meta }, parseTicketNumber(params.number), body.reason);
});
