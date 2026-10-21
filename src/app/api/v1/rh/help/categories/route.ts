import type { z } from "zod";
import { helpCategorySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveHelpCategory } from "@/server/services/rh/help";

export const POST = authed<Record<string, string>, z.infer<typeof helpCategorySchema>>({ permission: "help:manage", body: helpCategorySchema }, async ({ actor, meta, body }) => {
  const r = await saveHelpCategory({ actor, meta }, null, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
