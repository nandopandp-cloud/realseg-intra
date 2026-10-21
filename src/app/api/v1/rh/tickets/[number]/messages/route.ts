import { agentReplySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { parseTicketNumber } from "@/server/http/params";
import { agentReply } from "@/server/services/tickets";

/** Resposta do atendimento (ou nota interna), com até 5 anexos e mudança de situação opcional. */
export const POST = authed<{ number: string }>({ permission: "ticket:manage" }, async ({ actor, meta, params, req }) => {
  const { fields, files } = await readMultipart(req, { maxFiles: 5 });
  const data = agentReplySchema.parse(fields);
  await agentReply({ actor, meta }, parseTicketNumber(params.number), { body: data.body, internal: data.internal, setStatus: data.setStatus, files });
  return new Response(null, { status: 201, headers: { "Cache-Control": "no-store" } });
});
