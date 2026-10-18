import { authed, parseId } from "@/server/http/route";
import { getAnnouncement } from "@/server/services/announcements";

export const GET = authed<{ id: string }>({ permission: "announcement:read" }, async ({ actor, meta, params }) => getAnnouncement({ actor, meta }, parseId(params.id, "Comunicado")));
