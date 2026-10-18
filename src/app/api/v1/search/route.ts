import { z } from "zod";
import { authed } from "@/server/http/route";
import { globalSearch } from "@/server/services/search";

const query = z.object({ q: z.string().trim().min(2, "Digite ao menos 2 caracteres.").max(100) });
export const GET = authed({ query }, async ({ actor, meta, query }) => ({ items: await globalSearch({ actor, meta }, query.q) }));
