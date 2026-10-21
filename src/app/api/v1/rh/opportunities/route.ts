import type { z } from "zod";
import { opportunitySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveOpportunity } from "@/server/services/rh/career";

export const POST = authed<Record<string, string>, z.infer<typeof opportunitySchema>>({ permission: "career:manage", body: opportunitySchema }, async ({ actor, meta, body }) => {
  const r = await saveOpportunity({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
