import { authed, parseId } from "@/server/http/route";
import { archiveAnnouncement } from "@/server/services/rh/announcements";

export const POST = authed<{ id: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params }) => {
  await archiveAnnouncement({ actor, meta }, parseId(params.id, "Comunicado"));
});
