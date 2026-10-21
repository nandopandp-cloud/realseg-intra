import type { z } from "zod";
import { rolesSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setEmployeeRoles } from "@/server/services/rh/employees";

export const PUT = authed<{ id: string }, z.infer<typeof rolesSchema>>({ permission: "role:manage", body: rolesSchema }, async ({ actor, meta, params, body }) => {
  await setEmployeeRoles({ actor, meta }, parseId(params.id, "Colaborador"), body.roles);
});
