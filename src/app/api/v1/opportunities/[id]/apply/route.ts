import { opportunityApplySchema } from "@/lib/validation/forms";
import { authed, parseId } from "@/server/http/route";
import { applyToOpportunity } from "@/server/services/career";

export const POST = authed<{ id: string }, { message?: string }>({ permission: "opportunity:apply", body: opportunityApplySchema }, async ({ actor, meta, params, body }) =>
  applyToOpportunity({ actor, meta }, parseId(params.id, "Oportunidade"), body.message),
);
