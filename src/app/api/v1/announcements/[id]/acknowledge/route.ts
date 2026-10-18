import { authed, parseId } from "@/server/http/route";
import { acknowledgeAnnouncement } from "@/server/services/announcements";

export const POST = authed<{ id: string }>({ permission: "announcement:acknowledge" }, async ({ actor, meta, params }) => {
  const a = await acknowledgeAnnouncement({ actor, meta }, parseId(params.id, "Comunicado"));
  return { acknowledgedAt: a.acknowledgedAt };
});
