import { authed } from "@/server/http/route";
import { markAllRead } from "@/server/services/notifications";

export const POST = authed({ permission: "notification:read:own" }, async ({ actor, meta }) => {
  await markAllRead({ actor, meta });
});
