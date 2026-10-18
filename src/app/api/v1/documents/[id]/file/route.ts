import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { openDocumentFile } from "@/server/services/documents";

/** Download/visualização: reautoriza a cada acesso e registra auditoria. Nunca cacheável. */
export const GET = authed<{ id: string }>({}, async ({ actor, meta, params, req }) => {
  const disposition = req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const asset = await openDocumentFile({ actor, meta }, parseId(params.id, "Documento"), disposition);
  return fileResponse(asset, disposition);
});
