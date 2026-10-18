import { authed, parseId } from "@/server/http/route";
import { cancelSubmission } from "@/server/services/documents";

export const POST = authed<{ id: string }>({ permission: "document:submit:own" }, async ({ actor, meta, params }) => {
  await cancelSubmission({ actor, meta }, parseId(params.id, "Envio"));
});
