import type { z } from "zod";
import { courseSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { updateCourse } from "@/server/services/rh/courses";

export const PUT = authed<{ id: string }, z.infer<typeof courseSchema>>({ permission: "course:manage", body: courseSchema }, async ({ actor, meta, params, body }) => {
  await updateCourse({ actor, meta }, parseId(params.id, "Curso"), body);
});
