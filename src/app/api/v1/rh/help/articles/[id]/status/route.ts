import type { z } from "zod";
import { articleStatusSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setArticleStatus } from "@/server/services/rh/help";

export const POST = authed<{ id: string }, z.infer<typeof articleStatusSchema>>({ permission: "help:manage", body: articleStatusSchema }, async ({ actor, meta, params, body }) => {
  await setArticleStatus({ actor, meta }, parseId(params.id, "Artigo"), body.status);
});
