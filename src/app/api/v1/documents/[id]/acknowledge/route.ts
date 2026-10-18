import { authed, parseId } from "@/server/http/route";
import { acknowledgeDocument } from "@/server/services/documents";

export const POST = authed<{ id: string }>({ permission: "document:acknowledge:own" }, async ({ actor, meta, params }) => {
  const d = await acknowledgeDocument({ actor, meta }, parseId(params.id, "Documento"));
  return { acknowledgedAt: d.acknowledgedAt };
});
