import type { z } from "zod";
import { opportunityStatusSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setOpportunityStatus } from "@/server/services/rh/career";

export const POST = authed<{ id: string }, z.infer<typeof opportunityStatusSchema>>({ permission: "career:manage", body: opportunityStatusSchema }, async ({ actor, meta, params, body }) => {
  await setOpportunityStatus({ actor, meta }, parseId(params.id, "Oportunidade"), body.status, { notify: body.notify });
});
