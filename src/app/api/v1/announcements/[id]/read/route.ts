import { authed, parseId } from "@/server/http/route";
import { markAnnouncementRead } from "@/server/services/announcements";

/** Registra visualização (não é confirmação de ciência). */
export const POST = authed<{ id: string }>({ permission: "announcement:read" }, async ({ actor, meta, params }) => {
  await markAnnouncementRead({ actor, meta }, parseId(params.id, "Comunicado"));
});
