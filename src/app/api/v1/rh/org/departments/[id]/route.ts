import type { z } from "zod";
import { departmentSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveDepartment } from "@/server/services/rh/org";

export const PUT = authed<{ id: string }, z.infer<typeof departmentSchema>>({ permission: "employee:manage", body: departmentSchema }, async ({ actor, meta, params, body }) => {
  await saveDepartment({ actor, meta }, parseId(params.id, "Área"), body);
});
