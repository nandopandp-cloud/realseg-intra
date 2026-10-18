import { authed } from "@/server/http/route";
import { parseSlug } from "@/server/http/params";
import { getArticle } from "@/server/services/help";

export const GET = authed<{ slug: string }>({ permission: "help:read" }, async ({ actor, meta, params }) => getArticle({ actor, meta }, parseSlug(params.slug, "Artigo")));
