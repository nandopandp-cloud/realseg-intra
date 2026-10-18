import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { confirmResolution } from "@/server/services/tickets";

export const POST = authed<{ number: string }>({ permission: "ticket:comment:own" }, async ({ actor, meta, params }) => {
  await confirmResolution({ actor, meta }, parseTicketNumber(params.number));
});
