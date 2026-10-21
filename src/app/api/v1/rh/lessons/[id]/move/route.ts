import type { z } from "zod";
import { moveSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { moveLesson } from "@/server/services/rh/courses";

export const POST = authed<{ id: string }, z.infer<typeof moveSchema>>({ permission: "course:manage", body: moveSchema }, async ({ actor, meta, params, body }) => {
  await moveLesson({ actor, meta }, parseId(params.id, "Aula"), body.dir);
});
