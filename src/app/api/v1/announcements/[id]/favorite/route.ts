import { authed, parseId } from "@/server/http/route";
import { setFavorite } from "@/server/services/announcements";

export const PUT = authed<{ id: string }>({ permission: "announcement:read" }, async ({ actor, meta, params }) => setFavorite({ actor, meta }, parseId(params.id, "Comunicado"), true));
export const DELETE = authed<{ id: string }>({ permission: "announcement:read" }, async ({ actor, meta, params }) => setFavorite({ actor, meta }, parseId(params.id, "Comunicado"), false));
