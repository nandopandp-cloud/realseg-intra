import type { z } from "zod";
import { eventStatusSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setEventStatus } from "@/server/services/rh/events";

export const POST = authed<{ id: string }, z.infer<typeof eventStatusSchema>>({ permission: "announcement:manage", body: eventStatusSchema }, async ({ actor, meta, params, body }) => {
  await setEventStatus({ actor, meta }, parseId(params.id, "Evento"), body.status);
});
