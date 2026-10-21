import type { z } from "zod";
import { lessonSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { deleteLesson, updateLesson } from "@/server/services/rh/courses";

export const PUT = authed<{ id: string }, z.infer<typeof lessonSchema>>({ permission: "course:manage", body: lessonSchema }, async ({ actor, meta, params, body }) => {
  await updateLesson({ actor, meta }, parseId(params.id, "Aula"), body);
});

export const DELETE = authed<{ id: string }>({ permission: "course:manage" }, async ({ actor, meta, params }) => {
  await deleteLesson({ actor, meta }, parseId(params.id, "Aula"));
});
