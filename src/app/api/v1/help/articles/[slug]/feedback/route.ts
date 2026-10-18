import { z } from "zod";
import { authed } from "@/server/http/route";
import { parseSlug } from "@/server/http/params";
import { getArticle, voteArticle } from "@/server/services/help";

const body = z.object({ helpful: z.boolean() });
export const POST = authed<{ slug: string }, z.infer<typeof body>>({ permission: "help:read", body }, async ({ actor, meta, params, body }) => {
  const a = await getArticle({ actor, meta }, parseSlug(params.slug, "Artigo"));
  await voteArticle({ actor, meta }, a.id, body.helpful);
  return { ok: true };
});
