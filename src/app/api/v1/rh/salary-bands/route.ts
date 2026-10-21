import type { z } from "zod";
import { bandSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveBand } from "@/server/services/rh/career";

export const POST = authed<Record<string, string>, z.infer<typeof bandSchema>>({ permission: "career:manage", body: bandSchema }, async ({ actor, meta, body }) => {
  const r = await saveBand({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
