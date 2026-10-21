import type { z } from "zod";
import { moduleSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { addModule } from "@/server/services/rh/courses";

export const POST = authed<{ id: string }, z.infer<typeof moduleSchema>>({ permission: "course:manage", body: moduleSchema }, async ({ actor, meta, params, body }) => {
  const r = await addModule({ actor, meta }, parseId(params.id, "Curso"), body.title);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
