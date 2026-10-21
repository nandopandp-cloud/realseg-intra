import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { openTicketAttachmentAsAgent } from "@/server/services/rh/tickets";

export const GET = authed<{ number: string; id: string }>({ permission: "ticket:read:any" }, async ({ actor, meta, params, req }) => {
  const asset = await openTicketAttachmentAsAgent({ actor, meta }, parseTicketNumber(params.number), parseId(params.id, "Anexo"));
  return fileResponse(asset, req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment");
});
