import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { getMyTicket } from "@/server/services/tickets";

export const GET = authed<{ number: string }>({ permission: "ticket:read:own" }, async ({ actor, meta, params }) => getMyTicket({ actor, meta }, parseTicketNumber(params.number)));
