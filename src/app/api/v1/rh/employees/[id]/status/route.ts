import type { z } from "zod";
import { employeeStatusSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setEmployeeStatus } from "@/server/services/rh/employees";

export const POST = authed<{ id: string }, z.infer<typeof employeeStatusSchema>>({ permission: "employee:manage", body: employeeStatusSchema }, async ({ actor, meta, params, body }) => {
  await setEmployeeStatus({ actor, meta }, parseId(params.id, "Colaborador"), body.status);
});
