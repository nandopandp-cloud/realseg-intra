import type { z } from "zod";
import { goalSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { deleteGoal, saveGoal } from "@/server/services/rh/career";

export const PUT = authed<{ id: string; goalId: string }, z.infer<typeof goalSchema>>({ permission: "career:manage", body: goalSchema }, async ({ actor, meta, params, body }) => {
  await saveGoal({ actor, meta }, parseId(params.id, "Colaborador"), parseId(params.goalId, "Meta"), body);
});

export const DELETE = authed<{ id: string; goalId: string }>({ permission: "career:manage" }, async ({ actor, meta, params }) => {
  await deleteGoal({ actor, meta }, parseId(params.id, "Colaborador"), parseId(params.goalId, "Meta"));
});
