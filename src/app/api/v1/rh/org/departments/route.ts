import type { z } from "zod";
import { departmentSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveDepartment } from "@/server/services/rh/org";

export const POST = authed<Record<string, string>, z.infer<typeof departmentSchema>>({ permission: "employee:manage", body: departmentSchema }, async ({ actor, meta, body }) => {
  const r = await saveDepartment({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
