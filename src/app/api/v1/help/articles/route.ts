import { z } from "zod";
import { authed } from "@/server/http/route";
import { searchArticles } from "@/server/services/help";

const query = z.object({ q: z.string().trim().max(100).optional(), categoria: z.string().max(50).optional() });
export const GET = authed({ permission: "help:read", query }, async ({ actor, meta, query }) => ({ items: await searchArticles({ actor, meta }, { q: query.q, category: query.categoria }) }));
