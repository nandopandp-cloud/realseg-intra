import { authed, parseId } from "@/server/http/route";
import { getOpportunity } from "@/server/services/career";

export const GET = authed<{ id: string }>({ permission: "opportunity:read" }, async ({ actor, meta, params }) => getOpportunity({ actor, meta }, parseId(params.id, "Oportunidade")));
