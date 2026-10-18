import { ticketMessageSchema } from "@/lib/validation/forms";
import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { reopenMyTicket } from "@/server/services/tickets";

export const POST = authed<{ number: string }, { body: string }>({ permission: "ticket:comment:own", body: ticketMessageSchema }, async ({ actor, meta, params, body }) => {
  await reopenMyTicket({ actor, meta }, parseTicketNumber(params.number), body.body);
});
