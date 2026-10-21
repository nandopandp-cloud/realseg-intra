import type { z } from "zod";
import { courseCategorySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveCourseCategory } from "@/server/services/rh/courses";

export const POST = authed<Record<string, string>, z.infer<typeof courseCategorySchema>>({ permission: "course:manage", body: courseCategorySchema }, async ({ actor, meta, body }) => {
  const r = await saveCourseCategory({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
