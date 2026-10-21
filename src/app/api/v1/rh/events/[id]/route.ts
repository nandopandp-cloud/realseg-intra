import type { z } from "zod";
import { eventSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveEvent } from "@/server/services/rh/events";

export const PUT = authed<{ id: string }, z.infer<typeof eventSchema>>({ permission: "announcement:manage", body: eventSchema }, async ({ actor, meta, params, body }) => {
  await saveEvent({ actor, meta }, parseId(params.id, "Evento"), body);
});
