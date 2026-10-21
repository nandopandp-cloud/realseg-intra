import type { z } from "zod";
import { familySchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { saveFamily, deleteFamily } from "@/server/services/rh/org";

export const PUT = authed<{ id: string }, z.infer<typeof familySchema>>({ permission: "employee:manage", body: familySchema }, async ({ actor, meta, params, body }) => {
  await saveFamily({ actor, meta }, parseId(params.id, "Família"), body);
});

export const DELETE = authed<{ id: string }>({ permission: "employee:manage" }, async ({ actor, meta, params }) => {
  await deleteFamily({ actor, meta }, parseId(params.id, "Família"));
});
