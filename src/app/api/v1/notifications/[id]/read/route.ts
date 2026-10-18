import { authed, parseId } from "@/server/http/route";
import { markRead } from "@/server/services/notifications";

export const POST = authed<{ id: string }>({ permission: "notification:read:own" }, async ({ actor, meta, params }) => {
  await markRead({ actor, meta }, parseId(params.id, "Notificação"));
});
