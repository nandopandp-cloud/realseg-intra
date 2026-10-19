import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { requirePermission, type Ctx } from "../auth/actor";
import { getDb } from "../db/client";
import { helpArticleFeedback, helpArticles, helpCategories, ticketCategories } from "../db/schema";
import { notFound } from "../errors";
import { textSearch, ref } from "./audience";

const published = eq(helpArticles.status, "published");

const cardFields = {
  id: helpArticles.id,
  slug: helpArticles.slug,
  title: helpArticles.title,
  summary: helpArticles.summary,
  type: helpArticles.type,
  icon: helpArticles.icon,
  color: helpArticles.color,
  category: { slug: helpCategories.slug, name: helpCategories.name },
};

export async function helpCategoriesWithCounts(ctx: Ctx) {
  requirePermission(ctx.actor, "help:read");
  return getDb()
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      color: helpCategories.color,
      icon: helpCategories.icon,
      articles: sql<number>`(SELECT count(*)::int FROM ${helpArticles} a WHERE a.category_id = ${ref(helpCategories.id)} AND a.status = 'published')`,
    })
    .from(helpCategories)
    .orderBy(asc(helpCategories.position));
}

export async function popularArticles(ctx: Ctx, limit = 6) {
  requirePermission(ctx.actor, "help:read");
  return getDb().select(cardFields).from(helpArticles).innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId)).where(published).orderBy(desc(helpArticles.viewCount), asc(helpArticles.title)).limit(limit);
}

export async function searchArticles(ctx: Ctx, opts: { q?: string; category?: string; type?: "artigo" | "tutorial" | "faq" }) {
  requirePermission(ctx.actor, "help:read");
  return getDb()
    .select(cardFields)
    .from(helpArticles)
    .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
    .where(and(published, textSearch([helpArticles.title, helpArticles.summary, helpArticles.body], opts.q), opts.category ? eq(helpCategories.slug, opts.category) : undefined, opts.type ? eq(helpArticles.type, opts.type) : undefined))
    // Correspondência no título primeiro, depois popularidade.
    .orderBy(...(opts.q ? [sql`CASE WHEN ${textSearch([helpArticles.title], opts.q)} THEN 0 ELSE 1 END`] : []), desc(helpArticles.viewCount), asc(helpArticles.title))
    .limit(50);
}

const STOPWORDS = new Set(["como", "para", "sobre", "minha", "meu", "meus", "minhas", "esta", "está", "estou", "preciso", "quero", "gostaria", "fazer", "uma", "um", "com", "que", "não", "nao", "dos", "das", "pelo", "pela", "solicitação", "solicitacao", "dúvida", "duvida"]);

/**
 * Sugestões de artigos a partir de um texto livre (ex.: assunto de uma solicitação):
 * palavras significativas (≥ 4 letras, sem palavras comuns), ordenadas pelo número de palavras encontradas.
 */
export async function suggestArticles(ctx: Ctx, text: string, limit = 3) {
  requirePermission(ctx.actor, "help:read");
  const words = [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4 && !STOPWORDS.has(w)))].slice(0, 6);
  if (!words.length) return [];
  const hits = words.map((w) => sql`(CASE WHEN ${textSearch([helpArticles.title, helpArticles.summary], w)} THEN 1 ELSE 0 END)`);
  const score = sql<number>`(${sql.join(hits, sql` + `)})`;
  return getDb()
    .select(cardFields)
    .from(helpArticles)
    .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
    .where(and(published, sql`${score} > 0`))
    .orderBy(desc(score), desc(helpArticles.viewCount))
    .limit(limit);
}

export async function getHelpCategory(ctx: Ctx, slug: string) {
  requirePermission(ctx.actor, "help:read");
  const [cat] = await getDb().select().from(helpCategories).where(eq(helpCategories.slug, slug));
  if (!cat) throw notFound("Categoria");
  return cat;
}

export async function getArticle(ctx: Ctx, slug: string) {
  requirePermission(ctx.actor, "help:read");
  const db = getDb();
  const [row] = await db
    .select({
      ...cardFields,
      body: helpArticles.body,
      updatedAt: helpArticles.updatedAt,
      publishedAt: helpArticles.publishedAt,
      categoryId: helpArticles.categoryId,
      relatedTicket: { slug: ticketCategories.slug, name: ticketCategories.name },
    })
    .from(helpArticles)
    .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
    .leftJoin(ticketCategories, eq(ticketCategories.id, helpArticles.relatedTicketCategoryId))
    .where(and(eq(helpArticles.slug, slug), published));
  if (!row) throw notFound("Artigo");
  const [related, [vote], [tally]] = await Promise.all([
    db
      .select(cardFields)
      .from(helpArticles)
      .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
      .where(and(published, eq(helpArticles.categoryId, row.categoryId), ne(helpArticles.id, row.id)))
      .orderBy(desc(helpArticles.viewCount))
      .limit(3),
    db.select({ helpful: helpArticleFeedback.helpful }).from(helpArticleFeedback).where(and(eq(helpArticleFeedback.articleId, row.id), eq(helpArticleFeedback.userId, ctx.actor.userId))),
    db
      .select({ yes: sql<number>`count(*) FILTER (WHERE ${helpArticleFeedback.helpful})::int`, total: count() })
      .from(helpArticleFeedback)
      .where(eq(helpArticleFeedback.articleId, row.id)),
  ]);
  return { ...row, related, myVote: vote?.helpful ?? null, helpfulYes: tally.yes, helpfulTotal: tally.total };
}

/** Contador agregado e anônimo de acessos. */
export async function registerArticleView(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "help:read");
  const rows = await getDb()
    .update(helpArticles)
    .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
    .where(and(eq(helpArticles.id, id), published))
    .returning({ id: helpArticles.id });
  if (!rows.length) throw notFound("Artigo");
}

export async function voteArticle(ctx: Ctx, id: string, helpful: boolean) {
  requirePermission(ctx.actor, "help:read");
  const [a] = await getDb().select({ id: helpArticles.id }).from(helpArticles).where(and(eq(helpArticles.id, id), published));
  if (!a) throw notFound("Artigo");
  await getDb()
    .insert(helpArticleFeedback)
    .values({ articleId: id, userId: ctx.actor.userId, helpful })
    .onConflictDoUpdate({ target: [helpArticleFeedback.articleId, helpArticleFeedback.userId], set: { helpful, createdAt: new Date() } });
}
