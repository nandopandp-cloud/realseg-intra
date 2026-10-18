import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { audit } from "../audit";
import { requireEmployee, requirePermission, type Ctx } from "../auth/actor";
import { getDb } from "../db/client";
import {
  announcementAcknowledgements,
  announcementAttachments,
  announcementAudiences,
  announcementCategories,
  announcementFavorites,
  announcementReads,
  announcements,
  departments,
  events,
  fileAssets,
  jobFamilies,
  jobPositions,
  units,
} from "../db/schema";
import { invalidTransition, notFound } from "../errors";
import { audienceMatch, textSearch, ref } from "./audience";

export type AnnouncementTab = "todos" | "importantes" | "nao-lidos" | "favoritos";

/** Visível ao ator: publicado, já liberado e destinado ao seu público. Sempre aplicado na query. */
function visibleTo(ctx: Ctx): SQL {
  return and(
    eq(announcements.status, "published"),
    lte(announcements.publishedAt, sql`now()`),
    audienceMatch(announcementAudiences, announcementAudiences.announcementId, announcements.id, ctx.actor),
  )!;
}

const isReadSql = (userId: string) =>
  sql<boolean>`EXISTS (SELECT 1 FROM ${announcementReads} r WHERE r.announcement_id = ${ref(announcements.id)} AND r.user_id = ${userId} AND r.version = ${ref(announcements.version)})`;
const isAckSql = (userId: string) =>
  sql<boolean>`EXISTS (SELECT 1 FROM ${announcementAcknowledgements} k WHERE k.announcement_id = ${ref(announcements.id)} AND k.user_id = ${userId} AND k.version = ${ref(announcements.version)})`;
const isFavSql = (userId: string) =>
  sql<boolean>`EXISTS (SELECT 1 FROM ${announcementFavorites} f WHERE f.announcement_id = ${ref(announcements.id)} AND f.user_id = ${userId})`;

function tabFilter(tab: AnnouncementTab, userId: string): SQL | undefined {
  switch (tab) {
    case "importantes":
      return eq(announcements.isImportant, true);
    case "nao-lidos":
      return sql`NOT ${isReadSql(userId)}`;
    case "favoritos":
      return isFavSql(userId);
    default:
      return undefined;
  }
}

const listFields = (userId: string) => ({
  id: announcements.id,
  title: announcements.title,
  summary: announcements.summary,
  isImportant: announcements.isImportant,
  requiresAck: announcements.requiresAck,
  isFeatured: announcements.isFeatured,
  publishedAt: announcements.publishedAt,
  authorLabel: announcements.authorLabel,
  category: { slug: announcementCategories.slug, name: announcementCategories.name, color: announcementCategories.color, icon: announcementCategories.icon },
  isRead: isReadSql(userId),
  isAcknowledged: isAckSql(userId),
  isFavorite: isFavSql(userId),
});

export async function listAnnouncements(
  ctx: Ctx,
  opts: { tab?: AnnouncementTab; q?: string; category?: string; tag?: string; sort?: "recentes" | "antigos"; page?: number; pageSize?: number } = {},
) {
  requirePermission(ctx.actor, "announcement:read");
  const userId = ctx.actor.userId;
  const tab = opts.tab ?? "todos";
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;
  const base = and(visibleTo(ctx), textSearch([announcements.title, announcements.summary], opts.q), opts.category ? eq(announcementCategories.slug, opts.category) : undefined,
    opts.tag ? sql`${opts.tag} = ANY(${announcements.tags})` : undefined,
  );
  const where = and(base, tabFilter(tab, userId));
  const db = getDb();

  const [items, [{ total }], counts] = await Promise.all([
    db
      .select(listFields(userId))
      .from(announcements)
      .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
      .where(where)
      .orderBy(opts.sort === "antigos" ? asc(announcements.publishedAt) : desc(announcements.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(announcements).innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId)).where(where),
    db
      .select({
        todos: count(),
        importantes: sql<number>`count(*) FILTER (WHERE ${announcements.isImportant})`.mapWith(Number),
        naoLidos: sql<number>`count(*) FILTER (WHERE NOT ${isReadSql(userId)})`.mapWith(Number),
        favoritos: sql<number>`count(*) FILTER (WHERE ${isFavSql(userId)})`.mapWith(Number),
      })
      .from(announcements)
      .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
      .where(base),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts: counts[0] };
}

export async function unreadAnnouncementsCount(ctx: Ctx) {
  requirePermission(ctx.actor, "announcement:read");
  const [row] = await getDb()
    .select({ n: count() })
    .from(announcements)
    .where(and(visibleTo(ctx), sql`NOT ${isReadSql(ctx.actor.userId)}`));
  return row.n;
}

export async function getAnnouncement(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:read");
  const db = getDb();
  const [row] = await db
    .select({
      ...listFields(ctx.actor.userId),
      body: announcements.body,
      version: announcements.version,
      coverImage: announcements.coverImage,
      effectiveNote: announcements.effectiveNote,
      highlights: announcements.highlights,
      tags: announcements.tags,
      supportTicketCategory: announcements.supportTicketCategory,
    })
    .from(announcements)
    .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
    .where(and(eq(announcements.id, id), visibleTo(ctx)))
    .limit(1);
  if (!row) throw notFound("Comunicado");
  const [attachments, ackRow] = await Promise.all([
    db
      .select({ id: fileAssets.id, name: fileAssets.originalName, mimeType: fileAssets.mimeType, sizeBytes: fileAssets.sizeBytes })
      .from(announcementAttachments)
      .innerJoin(fileAssets, eq(fileAssets.id, announcementAttachments.fileId))
      .where(eq(announcementAttachments.announcementId, id))
      .orderBy(asc(announcementAttachments.position)),
    db
      .select({ at: announcementAcknowledgements.acknowledgedAt })
      .from(announcementAcknowledgements)
      .where(and(eq(announcementAcknowledgements.announcementId, id), eq(announcementAcknowledgements.userId, ctx.actor.userId), eq(announcementAcknowledgements.version, row.version))),
  ]);
  return { ...row, attachments, acknowledgedAt: ackRow[0]?.at ?? null };
}

/** Página de leitura: comunicado + público-alvo legível + relacionados (consultas em paralelo). */
export async function getAnnouncementPage(ctx: Ctx, id: string) {
  const a = await getAnnouncement(ctx, id);
  const [audience, related] = await Promise.all([audienceLabels(id), relatedAnnouncements(ctx, a)]);
  return { ...a, audience, related };
}

/** Público-alvo em texto (ex.: "Todos os colaboradores", "Unidade Rio de Janeiro"). */
async function audienceLabels(id: string): Promise<string[]> {
  const db = getDb();
  const rules = await db.select({ type: announcementAudiences.type, refId: announcementAudiences.refId }).from(announcementAudiences).where(eq(announcementAudiences.announcementId, id));
  if (!rules.length || rules.some((r) => r.type === "all")) return ["Todos os colaboradores"];
  const ids = (type: string) => rules.filter((r) => r.type === type && r.refId).map((r) => r.refId!);
  const pick = async (list: string[], q: (l: string[]) => Promise<Array<{ name: string }>>) => (list.length ? (await q(list)).map((r) => r.name) : []);
  const [u, d, p, f] = await Promise.all([
    pick(ids("unit"), (l) => db.select({ name: units.name }).from(units).where(inArray(units.id, l))),
    pick(ids("department"), (l) => db.select({ name: departments.name }).from(departments).where(inArray(departments.id, l))),
    pick(ids("job_position"), (l) => db.select({ name: jobPositions.title }).from(jobPositions).where(inArray(jobPositions.id, l))),
    pick(ids("job_family"), (l) => db.select({ name: jobFamilies.name }).from(jobFamilies).where(inArray(jobFamilies.id, l))),
  ]);
  return [...u, ...d.map((n) => `Área: ${n}`), ...p.map((n) => `Cargo: ${n}`), ...f.map((n) => `Família: ${n}`)];
}

/** Relacionados: mais tags em comum, depois mesma categoria, depois mais recentes — sempre dentro do que o ator pode ver. */
async function relatedAnnouncements(ctx: Ctx, a: { id: string; tags: string[]; category: { slug: string } }, limit = 2) {
  const tagArray = a.tags.length ? sql`ARRAY[${sql.join(a.tags.map((t) => sql`${t}`), sql`, `)}]::text[]` : sql`'{}'::text[]`;
  return getDb()
    .select({
      id: announcements.id,
      title: announcements.title,
      publishedAt: announcements.publishedAt,
      coverImage: announcements.coverImage,
      category: { slug: announcementCategories.slug, name: announcementCategories.name, color: announcementCategories.color, icon: announcementCategories.icon },
    })
    .from(announcements)
    .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
    .where(and(visibleTo(ctx), ne(announcements.id, a.id)))
    .orderBy(
      desc(sql`cardinality(ARRAY(SELECT unnest(${announcements.tags}) INTERSECT SELECT unnest(${tagArray})))`),
      desc(sql`${announcementCategories.slug} = ${a.category.slug}`),
      desc(announcements.publishedAt),
    )
    .limit(limit);
}

/** Registra visualização (idempotente por versão). Visualizar ≠ confirmar ciência. */
export async function markAnnouncementRead(ctx: Ctx, id: string) {
  const a = await getAnnouncement(ctx, id);
  await getDb().insert(announcementReads).values({ announcementId: id, userId: ctx.actor.userId, version: a.version }).onConflictDoNothing();
}

/** Confirmação formal de ciência — ação explícita, registrada por versão. */
export async function acknowledgeAnnouncement(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:acknowledge");
  requireEmployee(ctx.actor);
  const a = await getAnnouncement(ctx, id);
  if (!a.requiresAck) throw invalidTransition("Este comunicado não exige confirmação de ciência.");
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(announcementReads).values({ announcementId: id, userId: ctx.actor.userId, version: a.version }).onConflictDoNothing();
    const inserted = await tx
      .insert(announcementAcknowledgements)
      .values({ announcementId: id, userId: ctx.actor.userId, version: a.version })
      .onConflictDoNothing()
      .returning();
    if (inserted.length) {
      await audit({ action: "announcement.acknowledged", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, metadata: { version: a.version }, meta: ctx.meta }, tx);
    }
  });
  return getAnnouncement(ctx, id);
}

export async function setFavorite(ctx: Ctx, id: string, favorite: boolean) {
  requirePermission(ctx.actor, "announcement:read");
  await getAnnouncement(ctx, id);
  const db = getDb();
  if (favorite) {
    await db.insert(announcementFavorites).values({ announcementId: id, userId: ctx.actor.userId }).onConflictDoNothing();
  } else {
    await db.delete(announcementFavorites).where(and(eq(announcementFavorites.announcementId, id), eq(announcementFavorites.userId, ctx.actor.userId)));
  }
  return { favorite };
}

/** Comunicado de destaque para a Home: importante e pendente (ciência/leitura) primeiro. */
export async function highlightedAnnouncement(ctx: Ctx) {
  requirePermission(ctx.actor, "announcement:read");
  const userId = ctx.actor.userId;
  const [row] = await getDb()
    .select(listFields(userId))
    .from(announcements)
    .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
    .where(and(visibleTo(ctx), eq(announcements.isImportant, true)))
    .orderBy(
      sql`CASE WHEN ${announcements.requiresAck} AND NOT ${isAckSql(userId)} THEN 0 WHEN NOT ${isReadSql(userId)} THEN 1 ELSE 2 END`,
      desc(announcements.publishedAt),
    )
    .limit(1);
  return row ?? null;
}

export async function featuredAnnouncement(ctx: Ctx) {
  requirePermission(ctx.actor, "announcement:read");
  const [row] = await getDb()
    .select(listFields(ctx.actor.userId))
    .from(announcements)
    .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
    .where(and(visibleTo(ctx), eq(announcements.isFeatured, true)))
    .orderBy(desc(announcements.publishedAt))
    .limit(1);
  return row ?? null;
}

export async function pendingAcknowledgementsCount(ctx: Ctx) {
  requirePermission(ctx.actor, "announcement:read");
  const [row] = await getDb()
    .select({ n: count() })
    .from(announcements)
    .where(and(visibleTo(ctx), eq(announcements.requiresAck, true), sql`NOT ${isAckSql(ctx.actor.userId)}`));
  return row.n;
}

export async function listCategories() {
  return getDb().select().from(announcementCategories).orderBy(asc(announcementCategories.name));
}

/** Próximos eventos da unidade do colaborador (ou de todas as unidades). */
export async function upcomingEvents(ctx: Ctx, limit = 3) {
  requirePermission(ctx.actor, "announcement:read");
  const unitId = ctx.actor.employee?.unitId ?? null;
  return getDb()
    .select({ id: events.id, title: events.title, description: events.description, location: events.location, startsAt: events.startsAt, announcementId: events.announcementId })
    .from(events)
    .where(and(eq(events.status, "scheduled"), gte(events.startsAt, sql`now()`), unitId ? or(isNull(events.unitId), eq(events.unitId, unitId)) : isNull(events.unitId)))
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

/** Anexo de comunicado: só para quem pode ver o comunicado. */
export async function getAnnouncementAttachment(ctx: Ctx, announcementId: string, fileId: string) {
  const a = await getAnnouncement(ctx, announcementId);
  const att = a.attachments.find((f) => f.id === fileId);
  if (!att) throw notFound("Anexo");
  const [asset] = await getDb().select().from(fileAssets).where(eq(fileAssets.id, fileId));
  await audit({ action: "announcement.attachment_downloaded", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: announcementId, metadata: { fileId }, meta: ctx.meta });
  return asset;
}
