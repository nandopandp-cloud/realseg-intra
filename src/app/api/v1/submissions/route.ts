import { submissionCreateSchema } from "@/lib/validation/forms";
import { authed } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { createSubmission, listMySubmissions } from "@/server/services/documents";
import { validation } from "@/server/errors";

export const GET = authed({ permission: "document:submit:own" }, async ({ actor, meta }) => ({ items: await listMySubmissions({ actor, meta }) }));

/** Envio de documento ao RH (multipart: campos + 1 arquivo em "file"). */
export const POST = authed({ permission: "document:submit:own" }, async ({ actor, meta, req }) => {
  const { fields, files } = await readMultipart(req, { fileField: "file", maxFiles: 1 });
  const data = submissionCreateSchema.parse(fields);
  if (!files[0]) throw validation("Verifique os campos.", { file: ["Selecione um arquivo."] });
  const created = await createSubmission({ actor, meta }, { ...data, file: files[0] });
  return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
});
