import type { z } from "zod";
import { eventSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveEvent } from "@/server/services/rh/events";

export const POST = authed<Record<string, string>, z.infer<typeof eventSchema>>({ permission: "announcement:manage", body: eventSchema }, async ({ actor, meta, body }) => {
  const r = await saveEvent({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
