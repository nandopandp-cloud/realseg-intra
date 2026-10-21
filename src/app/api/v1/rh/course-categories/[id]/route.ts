import type { z } from "zod";
import { courseCategorySchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveCourseCategory } from "@/server/services/rh/courses";

export const PUT = authed<{ id: string }, z.infer<typeof courseCategorySchema>>({ permission: "course:manage", body: courseCategorySchema }, async ({ actor, meta, params, body }) => {
  await saveCourseCategory({ actor, meta }, parseId(params.id, "Categoria"), body);
});
