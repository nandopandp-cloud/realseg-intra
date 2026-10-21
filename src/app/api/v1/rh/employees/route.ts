import type { z } from "zod";
import { createEmployeeSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { createEmployee } from "@/server/services/rh/employees";

/** Cadastra colaborador e conta. A senha temporária (se escolhida) volta uma única vez nesta resposta. */
export const POST = authed<Record<string, string>, z.infer<typeof createEmployeeSchema>>({ permission: "employee:manage", body: createEmployeeSchema }, async ({ actor, meta, body }) => {
  const r = await createEmployee({ actor, meta }, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
