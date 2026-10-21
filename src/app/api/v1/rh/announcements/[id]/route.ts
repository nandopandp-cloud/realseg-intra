import { announcementSchema, type AnnouncementInput } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { deleteAnnouncement, getAnnouncementAdmin, updateAnnouncement } from "@/server/services/rh/announcements";

export const GET = authed<{ id: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params }) => getAnnouncementAdmin({ actor, meta }, parseId(params.id, "Comunicado")));

export const PUT = authed<{ id: string }, AnnouncementInput>({ permission: "announcement:manage", body: announcementSchema }, async ({ actor, meta, params, body }) => {
  const r = await updateAnnouncement({ actor, meta }, parseId(params.id, "Comunicado"), body);
  return { id: r.id, version: r.version };
});

/** Exclui um rascunho (publicados são arquivados, nunca apagados). */
export const DELETE = authed<{ id: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params }) => {
  await deleteAnnouncement({ actor, meta }, parseId(params.id, "Comunicado"));
});
