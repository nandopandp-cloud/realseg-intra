import type { z } from "zod";
import { opportunitySchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveOpportunity } from "@/server/services/rh/career";

export const PUT = authed<{ id: string }, z.infer<typeof opportunitySchema>>({ permission: "career:manage", body: opportunitySchema }, async ({ actor, meta, params, body }) => {
  await saveOpportunity({ actor, meta }, parseId(params.id, "Oportunidade"), body);
});
