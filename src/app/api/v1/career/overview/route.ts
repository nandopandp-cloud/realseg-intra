import { authed } from "@/server/http/route";
import { careerOverview } from "@/server/services/career";

export const GET = authed({ permission: "career:read" }, async ({ actor, meta }) => careerOverview({ actor, meta }));
