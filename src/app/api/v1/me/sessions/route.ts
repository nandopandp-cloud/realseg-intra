import { authed } from "@/server/http/route";
import { mySessions } from "@/server/services/profile";

export const GET = authed({ permission: "profile:read:own" }, async ({ actor, meta }) => ({ items: await mySessions({ actor, meta }) }));
