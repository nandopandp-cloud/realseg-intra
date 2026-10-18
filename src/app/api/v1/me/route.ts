import { authed } from "@/server/http/route";
import { getProfile } from "@/server/services/profile";

export const GET = authed({ permission: "profile:read:own" }, async ({ actor, meta }) => {
  const p = await getProfile({ actor, meta });
  return { ...p, roles: actor.roles };
});
