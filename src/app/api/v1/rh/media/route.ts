import { can } from "@/server/auth/actor";
import { forbidden, validation } from "@/server/errors";
import { authed } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { uploadCoverImage } from "@/server/services/rh/media";

/** Envio de imagem de capa (comunicados e cursos). Permissão verificada antes de ler o arquivo. */
export const POST = authed({}, async ({ actor, meta, req }) => {
  if (!can(actor, "announcement:manage") && !can(actor, "course:manage")) throw forbidden();
  const { files } = await readMultipart(req, { fileField: "file", maxFiles: 1 });
  if (!files[0]) throw validation("Selecione uma imagem.", { file: ["Selecione uma imagem."] });
  const r = await uploadCoverImage({ actor, meta }, files[0]);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
