import type { z } from "zod";
import { positionSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { savePosition } from "@/server/services/rh/org";

export const POST = authed<Record<string, string>, z.infer<typeof positionSchema>>({ permission: "employee:manage", body: positionSchema }, async ({ actor, meta, body }) => {
  const r = await savePosition({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
