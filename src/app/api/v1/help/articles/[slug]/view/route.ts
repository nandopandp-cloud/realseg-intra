import { authed } from "@/server/http/route";
import { parseSlug } from "@/server/http/params";
import { getArticle, registerArticleView } from "@/server/services/help";

/** Contador anônimo de acessos (não registra quem leu). */
export const POST = authed<{ slug: string }>({ permission: "help:read" }, async ({ actor, meta, params }) => {
  const a = await getArticle({ actor, meta }, parseSlug(params.slug, "Artigo"));
  await registerArticleView({ actor, meta }, a.id);
});
