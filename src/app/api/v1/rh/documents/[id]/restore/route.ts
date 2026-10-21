import { authed, parseId } from "@/server/http/route";
import { setDocumentArchived } from "@/server/services/rh/documents";

export const POST = authed<{ id: string }>({ permission: "document:manage" }, async ({ actor, meta, params }) => {
  await setDocumentArchived({ actor, meta }, parseId(params.id, "Documento"), false);
});
