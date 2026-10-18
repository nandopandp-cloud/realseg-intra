import { ticketMessageSchema } from "@/lib/validation/forms";
import { authed } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { parseTicketNumber } from "@/server/http/params";
import { addRequesterMessage } from "@/server/services/tickets";

export const POST = authed<{ number: string }>({ permission: "ticket:comment:own" }, async ({ actor, meta, params, req }) => {
  const { fields, files } = await readMultipart(req, { maxFiles: 5 });
  const data = ticketMessageSchema.parse(fields);
  const r = await addRequesterMessage({ actor, meta }, parseTicketNumber(params.number), { body: data.body, files });
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
