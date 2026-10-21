import type { z } from "zod";
import { pathSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { deletePath, savePath } from "@/server/services/rh/courses";

export const PUT = authed<{ id: string }, z.infer<typeof pathSchema>>({ permission: "course:manage", body: pathSchema }, async ({ actor, meta, params, body }) => {
  await savePath({ actor, meta }, parseId(params.id, "Trilha"), body);
});

export const DELETE = authed<{ id: string }>({ permission: "course:manage" }, async ({ actor, meta, params }) => {
  await deletePath({ actor, meta }, parseId(params.id, "Trilha"));
});
