import type { z } from "zod";
import { pathSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { savePath } from "@/server/services/rh/courses";

export const POST = authed<Record<string, string>, z.infer<typeof pathSchema>>({ permission: "course:manage", body: pathSchema }, async ({ actor, meta, body }) => {
  const r = await savePath({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
