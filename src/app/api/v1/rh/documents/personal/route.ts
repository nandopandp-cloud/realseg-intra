import { distributeFieldsSchema } from "@/lib/validation/rh";
import { validation } from "@/server/errors";
import { authed } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { distributePersonalDocument } from "@/server/services/rh/documents";

/** Distribui um documento pessoal (1 arquivo por requisição — o lote é enviado arquivo a arquivo). */
export const POST = authed({ permission: "document:manage" }, async ({ actor, meta, req }) => {
  const { fields, files } = await readMultipart(req, { fileField: "file", maxFiles: 1 });
  const data = distributeFieldsSchema.parse(fields);
  if (!files[0]) throw validation("Selecione o arquivo.", { file: ["Selecione o arquivo."] });
  const r = await distributePersonalDocument({ actor, meta }, { ...data, file: files[0] });
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
