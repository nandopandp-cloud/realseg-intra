import { fileResponse } from "@/server/files/storage";
import { authed, parseId } from "@/server/http/route";
import { getAnnouncementAttachment } from "@/server/services/announcements";

export const GET = authed<{ id: string; fileId: string }>({ permission: "announcement:read" }, async ({ actor, meta, params, req }) => {
  const asset = await getAnnouncementAttachment({ actor, meta }, parseId(params.id, "Comunicado"), parseId(params.fileId, "Anexo"));
  return fileResponse(asset, req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment");
});
