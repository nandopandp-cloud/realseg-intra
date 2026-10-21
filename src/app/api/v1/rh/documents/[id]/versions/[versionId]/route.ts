import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { openDocumentVersionAdmin } from "@/server/services/rh/documents";

export const GET = authed<{ id: string; versionId: string }>({ permission: "document:read:any" }, async ({ actor, meta, params, req }) => {
  const asset = await openDocumentVersionAdmin({ actor, meta }, parseId(params.id, "Documento"), parseId(params.versionId, "Versão"));
  return fileResponse(asset, req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment");
});
