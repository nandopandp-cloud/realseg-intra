import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { openAnnouncementAttachmentAdmin, removeAnnouncementAttachment } from "@/server/services/rh/announcements";

export const GET = authed<{ id: string; fileId: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params }) => {
  const asset = await openAnnouncementAttachmentAdmin({ actor, meta }, parseId(params.id, "Comunicado"), parseId(params.fileId, "Anexo"));
  return fileResponse(asset, "attachment");
});

export const DELETE = authed<{ id: string; fileId: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params }) => {
  await removeAnnouncementAttachment({ actor, meta }, parseId(params.id, "Comunicado"), parseId(params.fileId, "Anexo"));
});
