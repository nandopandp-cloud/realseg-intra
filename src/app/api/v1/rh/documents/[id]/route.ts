import type { z } from "zod";
import { documentMetaSchema, removeReasonSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { removeDocument, updateDocumentMeta } from "@/server/services/rh/documents";

export const PUT = authed<{ id: string }, z.infer<typeof documentMetaSchema>>({ permission: "document:manage", body: documentMetaSchema }, async ({ actor, meta, params, body }) => {
  await updateDocumentMeta({ actor, meta }, parseId(params.id, "Documento"), body);
});

/** Remove documento enviado por engano (exclusão lógica, com motivo auditado). */
export const DELETE = authed<{ id: string }, z.infer<typeof removeReasonSchema>>({ permission: "document:manage", body: removeReasonSchema }, async ({ actor, meta, params, body }) => {
  await removeDocument({ actor, meta }, parseId(params.id, "Documento"), body.reason);
});
