import type { z } from "zod";
import { courseSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { createCourse } from "@/server/services/rh/courses";

export const POST = authed<Record<string, string>, z.infer<typeof courseSchema>>({ permission: "course:manage", body: courseSchema }, async ({ actor, meta, body }) => {
  const r = await createCourse({ actor, meta }, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
