import type { z } from "zod";
import { courseStatusSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setCourseStatus } from "@/server/services/rh/courses";

export const POST = authed<{ id: string }, z.infer<typeof courseStatusSchema>>({ permission: "course:manage", body: courseStatusSchema }, async ({ actor, meta, params, body }) => {
  await setCourseStatus({ actor, meta }, parseId(params.id, "Curso"), body.status);
});
