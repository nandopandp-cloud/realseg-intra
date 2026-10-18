import { authed } from "@/server/http/route";
import { upcomingEvents } from "@/server/services/announcements";

export const GET = authed({ permission: "announcement:read" }, async ({ actor, meta }) => ({ items: await upcomingEvents({ actor, meta }, 10) }));
