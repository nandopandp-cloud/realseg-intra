import { z } from "zod";
import { can } from "@/server/auth/actor";
import { forbidden } from "@/server/errors";
import { authed } from "@/server/http/route";
import { searchEmployees } from "@/server/services/rh/employee-search";

const query = z.object({ q: z.string().max(100).default("") });

/** Busca rápida de colaboradores para seletores da gestão. */
export const GET = authed<Record<string, string>, undefined, z.infer<typeof query>>({ query }, async ({ actor, meta, query }) => {
  if (!can(actor, "employee:read:any") && !can(actor, "document:manage") && !can(actor, "feedback:write:any") && !can(actor, "career:manage")) throw forbidden();
  return { items: await searchEmployees({ actor, meta }, query.q) };
});
