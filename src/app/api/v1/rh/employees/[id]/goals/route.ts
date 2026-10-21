import type { z } from "zod";
import { goalSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveGoal } from "@/server/services/rh/career";

export const POST = authed<{ id: string }, z.infer<typeof goalSchema>>({ permission: "career:manage", body: goalSchema }, async ({ actor, meta, params, body }) => {
  const r = await saveGoal({ actor, meta }, parseId(params.id, "Colaborador"), null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
