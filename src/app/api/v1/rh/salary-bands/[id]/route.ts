import type { z } from "zod";
import { bandSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { deleteBand, saveBand } from "@/server/services/rh/career";

export const PUT = authed<{ id: string }, z.infer<typeof bandSchema>>({ permission: "career:manage", body: bandSchema }, async ({ actor, meta, params, body }) => {
  await saveBand({ actor, meta }, parseId(params.id, "Faixa"), body);
});

export const DELETE = authed<{ id: string }>({ permission: "career:manage" }, async ({ actor, meta, params }) => {
  await deleteBand({ actor, meta }, parseId(params.id, "Faixa"));
});
