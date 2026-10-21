import type { z } from "zod";
import { assignSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { assignCourse } from "@/server/services/rh/courses";

export const POST = authed<{ id: string }, z.infer<typeof assignSchema>>({ permission: "course:manage", body: assignSchema }, async ({ actor, meta, params, body }) => assignCourse({ actor, meta }, parseId(params.id, "Curso"), body));
