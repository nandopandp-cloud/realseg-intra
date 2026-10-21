import type { z } from "zod";
import { articleSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveArticle } from "@/server/services/rh/help";

export const POST = authed<Record<string, string>, z.infer<typeof articleSchema>>({ permission: "help:manage", body: articleSchema }, async ({ actor, meta, body }) => {
  const r = await saveArticle({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
