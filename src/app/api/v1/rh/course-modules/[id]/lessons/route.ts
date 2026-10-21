import type { z } from "zod";
import { lessonSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { addLesson } from "@/server/services/rh/courses";

export const POST = authed<{ id: string }, z.infer<typeof lessonSchema>>({ permission: "course:manage", body: lessonSchema }, async ({ actor, meta, params, body }) => {
  const r = await addLesson({ actor, meta }, parseId(params.id, "Módulo"), body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
