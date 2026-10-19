import { z } from "zod";
import { authed } from "@/server/http/route";
import { searchArticles, suggestArticles } from "@/server/services/help";

const query = z.object({ q: z.string().trim().max(100).optional(), categoria: z.string().max(50).optional(), sugerir: z.string().trim().max(200).optional() });
export const GET = authed({ permission: "help:read", query }, async ({ actor, meta, query }) => ({
  // `?sugerir=texto` → até 3 artigos relacionados a um texto livre (assunto de solicitação, chat).
  items: query.sugerir !== undefined ? await suggestArticles({ actor, meta }, query.sugerir) : await searchArticles({ actor, meta }, { q: query.q, category: query.categoria }),
}));
