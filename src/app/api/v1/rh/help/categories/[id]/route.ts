import type { z } from "zod";
import { helpCategorySchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveHelpCategory } from "@/server/services/rh/help";

export const PUT = authed<{ id: string }, z.infer<typeof helpCategorySchema>>({ permission: "help:manage", body: helpCategorySchema }, async ({ actor, meta, params, body }) => {
  await saveHelpCategory({ actor, meta }, parseId(params.id, "Categoria"), body);
});
