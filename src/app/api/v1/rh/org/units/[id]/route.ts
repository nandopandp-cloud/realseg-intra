import type { z } from "zod";
import { unitSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveUnit } from "@/server/services/rh/org";

export const PUT = authed<{ id: string }, z.infer<typeof unitSchema>>({ permission: "employee:manage", body: unitSchema }, async ({ actor, meta, params, body }) => {
  await saveUnit({ actor, meta }, parseId(params.id, "Unidade"), body);
});
