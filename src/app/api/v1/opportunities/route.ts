import { authed } from "@/server/http/route";
import { listOpportunities } from "@/server/services/career";

export const GET = authed({ permission: "opportunity:read" }, async ({ actor, meta }) => ({ items: await listOpportunities({ actor, meta }) }));
