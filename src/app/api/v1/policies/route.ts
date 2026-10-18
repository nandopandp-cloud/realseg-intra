import { z } from "zod";
import { authed } from "@/server/http/route";
import { listPolicies } from "@/server/services/documents";

const query = z.object({ q: z.string().trim().max(100).optional() });
export const GET = authed({ permission: "policy:read", query }, async ({ actor, meta, query }) => ({ items: await listPolicies({ actor, meta }, query) }));
