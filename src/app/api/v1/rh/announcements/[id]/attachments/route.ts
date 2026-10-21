import { authed, parseId } from "@/server/http/route";
import { readMultipart } from "@/server/http/multipart";
import { validation } from "@/server/errors";
import { addAnnouncementAttachments } from "@/server/services/rh/announcements";

/** Anexos do comunicado (PDF, JPG ou PNG; até 10 por comunicado). */
export const POST = authed<{ id: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params, req }) => {
  const id = parseId(params.id, "Comunicado");
  const { files } = await readMultipart(req, { maxFiles: 10 });
  if (!files.length) throw validation("Selecione ao menos um arquivo.", { files: ["Selecione ao menos um arquivo."] });
  await addAnnouncementAttachments({ actor, meta }, id, files);
  return new Response(null, { status: 201, headers: { "Cache-Control": "no-store" } });
});
