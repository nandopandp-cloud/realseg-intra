import type { z } from "zod";
import { positionSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { savePosition } from "@/server/services/rh/org";

export const PUT = authed<{ id: string }, z.infer<typeof positionSchema>>({ permission: "employee:manage", body: positionSchema }, async ({ actor, meta, params, body }) => {
  await savePosition({ actor, meta }, parseId(params.id, "Cargo"), body);
});
