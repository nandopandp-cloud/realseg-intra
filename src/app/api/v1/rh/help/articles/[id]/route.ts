import type { z } from "zod";
import { articleSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveArticle } from "@/server/services/rh/help";

export const PUT = authed<{ id: string }, z.infer<typeof articleSchema>>({ permission: "help:manage", body: articleSchema }, async ({ actor, meta, params, body }) => {
  await saveArticle({ actor, meta }, parseId(params.id, "Artigo"), body);
});
