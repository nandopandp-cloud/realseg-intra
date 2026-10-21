import { versionFieldsSchema } from "@/lib/validation/rh";
import { validation } from "@/server/errors";
import { authed, parseId } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { addDocumentVersion } from "@/server/services/rh/documents";

export const POST = authed<{ id: string }>({ permission: "document:manage" }, async ({ actor, meta, params, req }) => {
  const id = parseId(params.id, "Documento");
  const { fields, files } = await readMultipart(req, { fileField: "file", maxFiles: 1 });
  const data = versionFieldsSchema.parse(fields);
  if (!files[0]) throw validation("Selecione o arquivo da nova versão.", { file: ["Selecione o arquivo."] });
  const r = await addDocumentVersion({ actor, meta }, id, { file: files[0], changeNote: data.changeNote, notify: data.notify });
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
