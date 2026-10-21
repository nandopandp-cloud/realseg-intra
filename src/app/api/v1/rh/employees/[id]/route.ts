import type { z } from "zod";
import { employeeSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { updateEmployee } from "@/server/services/rh/employees";

export const PUT = authed<{ id: string }, z.infer<typeof employeeSchema>>({ permission: "employee:manage", body: employeeSchema }, async ({ actor, meta, params, body }) => {
  await updateEmployee({ actor, meta }, parseId(params.id, "Colaborador"), body);
});
