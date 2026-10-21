import type { z } from "zod";
import { unitSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveUnit } from "@/server/services/rh/org";

export const POST = authed<Record<string, string>, z.infer<typeof unitSchema>>({ permission: "employee:manage", body: unitSchema }, async ({ actor, meta, body }) => {
  const r = await saveUnit({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
