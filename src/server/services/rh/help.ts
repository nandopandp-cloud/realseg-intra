import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { helpArticleFeedback, helpArticles, helpCategories, ticketCategories } from "../../db/schema";
import { notFound, validation } from "../../errors";
import { ref, textSearch } from "../audience";
import { slugify } from "./courses";

export const HELP_TABS = ["publicados", "rascunhos", "arquivados"] as const;
const TAB_STATUS = { publicados: "published", rascunhos: "draft", arquivados: "archived" } as const;

const helpful = sql<number>`(SELECT count(*)::int FROM ${helpArticleFeedback} f WHERE f.article_id = ${ref(helpArticles.id)} AND f.helpful)`.mapWith(Number);
const notHelpful = sql<number>`(SELECT count(*)::int FROM ${helpArticleFeedback} f WHERE f.article_id = ${ref(helpArticles.id)} AND NOT f.helpful)`.mapWith(Number);

export async function listArticlesAdmin(ctx: Ctx, opts: { tab?: (typeof HELP_TABS)[number]; q?: string; category?: string } = {}) {
  requirePermission(ctx.actor, "help:manage");
  const tab = opts.tab ?? "publicados";
  const base = and(textSearch([helpArticles.title, helpArticles.summary], opts.q), opts.category ? eq(helpCategories.slug, opts.category) : undefined);
  const db = getDb();
  const [items, [counts]] = await Promise.all([
    db
      .select({
        id: helpArticles.id,
        slug: helpArticles.slug,
        title: helpArticles.title,
        type: helpArticles.type,
        status: helpArticles.status,
        viewCount: helpArticles.viewCount,
        updatedAt: helpArticles.updatedAt,
        category: { name: helpCategories.name },
        helpful,
        notHelpful,
      })
      .from(helpArticles)
      .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
      .where(and(base, eq(helpArticles.status, TAB_STATUS[tab])))
      .orderBy(desc(helpArticles.viewCount), asc(helpArticles.title)),
    db
      .select({
        publicados: sql<number>`count(*) FILTER (WHERE ${helpArticles.status} = 'published')`.mapWith(Number),
        rascunhos: sql<number>`count(*) FILTER (WHERE ${helpArticles.status} = 'draft')`.mapWith(Number),
        arquivados: sql<number>`count(*) FILTER (WHERE ${helpArticles.status} = 'archived')`.mapWith(Number),
      })
      .from(helpArticles)
      .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
      .where(base),
  ]);
  return { items, counts };
}

export async function getArticleAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "help:manage");
  const [row] = await getDb()
    .select({ a: helpArticles, categorySlug: helpCategories.slug, ticketCategorySlug: ticketCategories.slug, helpful, notHelpful })
    .from(helpArticles)
    .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
    .leftJoin(ticketCategories, eq(ticketCategories.id, helpArticles.relatedTicketCategoryId))
    .where(eq(helpArticles.id, id));
  if (!row) throw notFound("Artigo");
  return { ...row.a, categorySlug: row.categorySlug, ticketCategorySlug: row.ticketCategorySlug, helpful: row.helpful, notHelpful: row.notHelpful };
}

export type ArticleInput = { title: string; summary: string; body: string; categorySlug: string; type: "artigo" | "tutorial" | "faq"; icon: string; color: string; ticketCategorySlug: string | null };

export async function saveArticle(ctx: Ctx, id: string | null, input: ArticleInput) {
  requirePermission(ctx.actor, "help:manage");
  const db = getDb();
  const [cat] = await db.select().from(helpCategories).where(eq(helpCategories.slug, input.categorySlug));
  if (!cat) throw validation("Categoria inválida.", { categorySlug: ["Escolha uma categoria."] });
  let ticketCategoryId: string | null = null;
  if (input.ticketCategorySlug) {
    const [tc] = await db.select().from(ticketCategories).where(eq(ticketCategories.slug, input.ticketCategorySlug));
    if (!tc) throw validation("Área inválida.", { ticketCategorySlug: ["Escolha uma área."] });
    ticketCategoryId = tc.id;
  }
  const values = { title: input.title.trim(), summary: input.summary.trim(), body: input.body.trim(), categoryId: cat.id, type: input.type, icon: input.icon, color: input.color, relatedTicketCategoryId: ticketCategoryId };
  let row: { id: string } | undefined;
  if (id) {
    [row] = await db.update(helpArticles).set({ ...values, updatedAt: new Date() }).where(eq(helpArticles.id, id)).returning({ id: helpArticles.id });
    if (!row) throw notFound("Artigo");
  } else {
    // Endereço único derivado do título (sufixo numérico se já existir).
    const base = slugify(input.title) || "artigo";
    const taken = new Set((await db.select({ slug: helpArticles.slug }).from(helpArticles).where(sql`${helpArticles.slug} LIKE ${`${base}%`}`)).map((r) => r.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    [row] = await db.insert(helpArticles).values({ ...values, slug, status: "draft" }).returning({ id: helpArticles.id });
  }
  await audit({ action: "help.saved", actorUserId: ctx.actor.userId, entityType: "help_article", entityId: row.id, meta: ctx.meta });
  return row;
}

export async function setArticleStatus(ctx: Ctx, id: string, status: "draft" | "published" | "archived") {
  requirePermission(ctx.actor, "help:manage");
  const db = getDb();
  const [a] = await db.select().from(helpArticles).where(eq(helpArticles.id, id));
  if (!a) throw notFound("Artigo");
  await db
    .update(helpArticles)
    .set({ status, publishedAt: status === "published" ? (a.publishedAt ?? new Date()) : a.publishedAt, updatedAt: new Date() })
    .where(eq(helpArticles.id, id));
  await audit({ action: "help.status_changed", actorUserId: ctx.actor.userId, entityType: "help_article", entityId: id, metadata: { from: a.status, to: status }, meta: ctx.meta });
}

export async function listHelpCategoriesAdmin(ctx: Ctx) {
  requirePermission(ctx.actor, "help:manage");
  return getDb()
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      color: helpCategories.color,
      icon: helpCategories.icon,
      position: helpCategories.position,
      articles: sql<number>`(SELECT count(*)::int FROM ${helpArticles} a WHERE a.category_id = ${ref(helpCategories.id)})`.mapWith(Number),
    })
    .from(helpCategories)
    .orderBy(asc(helpCategories.position));
}

export async function saveHelpCategory(ctx: Ctx, id: string | null, input: { name: string; description: string; color: string; icon: string }) {
  requirePermission(ctx.actor, "help:manage");
  const db = getDb();
  const slug = slugify(input.name);
  const [dup] = await db.select({ id: helpCategories.id }).from(helpCategories).where(eq(helpCategories.slug, slug));
  if (dup && dup.id !== id) throw validation("Já existe uma categoria com este nome.", { name: ["Use outro nome."] });
  const values = { name: input.name.trim(), slug, description: input.description.trim(), color: input.color, icon: input.icon };
  let row: { id: string } | undefined;
  if (id) [row] = await db.update(helpCategories).set(values).where(eq(helpCategories.id, id)).returning({ id: helpCategories.id });
  else {
    const [{ n }] = await db.select({ n: count() }).from(helpCategories);
    [row] = await db.insert(helpCategories).values({ ...values, position: n + 1 }).returning({ id: helpCategories.id });
  }
  if (!row) throw notFound("Categoria");
  await audit({ action: "help_category.saved", actorUserId: ctx.actor.userId, entityType: "help_category", entityId: row.id, meta: ctx.meta });
  return row;
}
