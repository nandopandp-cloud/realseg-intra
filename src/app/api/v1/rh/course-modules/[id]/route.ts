import type { z } from "zod";
import { moduleSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { deleteModule, renameModule } from "@/server/services/rh/courses";

export const PUT = authed<{ id: string }, z.infer<typeof moduleSchema>>({ permission: "course:manage", body: moduleSchema }, async ({ actor, meta, params, body }) => {
  await renameModule({ actor, meta }, parseId(params.id, "Módulo"), body.title);
});

export const DELETE = authed<{ id: string }>({ permission: "course:manage" }, async ({ actor, meta, params }) => {
  await deleteModule({ actor, meta }, parseId(params.id, "Módulo"));
});
