import { and, asc, count, desc, eq, lte, sql, type SQL } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb, type Executor } from "../../db/client";
import {
  announcementAcknowledgements,
  announcementAttachments,
  announcementAudiences,
  announcementCategories,
  announcementReads,
  announcements,
  fileAssets,
  ticketCategories,
  type AnnouncementStatus,
} from "../../db/schema";
import { conflict, invalidTransition, notFound, validation } from "../../errors";
import { storeUpload } from "../../files/storage";
import { logger } from "../../logger";
import type { AnnouncementInput } from "@/lib/validation/rh";
import { textSearch } from "../audience";
import { notify } from "../notifications";
import { assertAudienceRefs, audienceUserIds, describeAudience, employeeInAudience, fromRules, toRules } from "./audience";

export const ANNOUNCEMENT_TABS = ["todos", "publicados", "agendados", "rascunhos", "arquivados"] as const;
export type AnnouncementTab = (typeof ANNOUNCEMENT_TABS)[number];
const TAB_STATUS: Record<Exclude<AnnouncementTab, "todos">, AnnouncementStatus> = { publicados: "published", agendados: "scheduled", rascunhos: "draft", arquivados: "archived" };

const MAX_ATTACHMENTS = 10;

/** Tamanho do público (colaboradores com acesso) — subconsulta correlacionada por comunicado. */
const audienceSize = sql<number>`(
  SELECT count(*) FROM employees e
  JOIN job_positions jp ON jp.id = e.job_position_id
  JOIN users u ON u.id = e.user_id
  WHERE e.status <> 'desligado' AND u.status = 'active' AND u.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM announcement_audiences a WHERE a.announcement_id = "announcements"."id" AND (
      a.type = 'all' OR (a.type = 'department' AND a.ref_id = e.department_id) OR (a.type = 'unit' AND a.ref_id = e.unit_id)
      OR (a.type = 'job_position' AND a.ref_id = e.job_position_id) OR (a.type = 'job_family' AND a.ref_id = jp.family_id)))
)`.mapWith(Number);
const readCount = sql<number>`(SELECT count(*) FROM announcement_reads r WHERE r.announcement_id = "announcements"."id" AND r.version = "announcements"."version")`.mapWith(Number);
const ackCount = sql<number>`(SELECT count(*) FROM announcement_acknowledgements k WHERE k.announcement_id = "announcements"."id" AND k.version = "announcements"."version")`.mapWith(Number);

/** Agendado com data já alcançada já está visível ao colaborador; para a gestão, exibimos como publicado. */
export function effectiveStatus(a: { status: AnnouncementStatus; publishAt: Date | null }, now = new Date()): AnnouncementStatus {
  return a.status === "scheduled" && a.publishAt && a.publishAt <= now ? "published" : a.status;
}

export async function listAnnouncementsAdmin(ctx: Ctx, opts: { tab?: AnnouncementTab; q?: string; category?: string; page?: number; pageSize?: number } = {}) {
  requirePermission(ctx.actor, "announcement:manage");
  await publishDueAnnouncements().catch((err) => logger.warn("announcements.publish_due_failed", { err }));
  const tab = opts.tab ?? "todos";
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 15;
  const base = and(textSearch([announcements.title, announcements.summary], opts.q), opts.category ? eq(announcementCategories.slug, opts.category) : undefined);
  const where = and(base, tab === "todos" ? undefined : eq(announcements.status, TAB_STATUS[tab]));
  const db = getDb();
  const [items, [{ n: total }], [counts]] = await Promise.all([
    db
      .select({
        id: announcements.id,
        title: announcements.title,
        status: announcements.status,
        isImportant: announcements.isImportant,
        requiresAck: announcements.requiresAck,
        isFeatured: announcements.isFeatured,
        publishedAt: sql<Date | null>`coalesce(${announcements.publishedAt}, ${announcements.publishAt})`.mapWith(announcements.publishedAt),
        publishAt: announcements.publishAt,
        updatedAt: announcements.updatedAt,
        version: announcements.version,
        category: { name: announcementCategories.name, color: announcementCategories.color, icon: announcementCategories.icon },
        audienceSize,
        readCount,
        ackCount,
      })
      .from(announcements)
      .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
      .where(where)
      .orderBy(sql`CASE ${announcements.status} WHEN 'draft' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'published' THEN 2 ELSE 3 END`, desc(sql`coalesce(${announcements.publishedAt}, ${announcements.publishAt}, ${announcements.updatedAt})`))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(announcements).innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId)).where(where),
    db
      .select({
        todos: count(),
        publicados: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'published')`.mapWith(Number),
        agendados: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'scheduled')`.mapWith(Number),
        rascunhos: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'draft')`.mapWith(Number),
        arquivados: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'archived')`.mapWith(Number),
      })
      .from(announcements)
      .innerJoin(announcementCategories, eq(announcementCategories.id, announcements.categoryId))
      .where(base),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts };
}

async function findAnnouncement(id: string, db: Executor = getDb()) {
  const [row] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  if (!row) throw notFound("Comunicado");
  return row;
}

/** Comunicado completo para edição (inclui público e anexos). */
export async function getAnnouncementAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const db = getDb();
  const a = await findAnnouncement(id);
  const [[cat], rules, attachments, [stats]] = await Promise.all([
    db.select().from(announcementCategories).where(eq(announcementCategories.id, a.categoryId)),
    db.select({ type: announcementAudiences.type, refId: announcementAudiences.refId }).from(announcementAudiences).where(eq(announcementAudiences.announcementId, id)),
    db
      .select({ id: fileAssets.id, name: fileAssets.originalName, mimeType: fileAssets.mimeType, sizeBytes: fileAssets.sizeBytes })
      .from(announcementAttachments)
      .innerJoin(fileAssets, eq(fileAssets.id, announcementAttachments.fileId))
      .where(eq(announcementAttachments.announcementId, id))
      .orderBy(asc(announcementAttachments.position)),
    db.select({ audienceSize, readCount, ackCount }).from(announcements).where(eq(announcements.id, id)),
  ]);
  const audience = fromRules(rules);
  return { ...a, status: effectiveStatus(a), categorySlug: cat.slug, category: cat, audience, audienceLabels: await describeAudience(db, audience), attachments, stats };
}

async function resolveRefs(db: Executor, input: AnnouncementInput) {
  const [cat] = await db.select().from(announcementCategories).where(eq(announcementCategories.slug, input.categorySlug));
  if (!cat) throw validation("Categoria inválida.", { categorySlug: ["Escolha uma categoria da lista."] });
  if (input.supportTicketCategory) {
    const [tc] = await db.select({ id: ticketCategories.id }).from(ticketCategories).where(eq(ticketCategories.slug, input.supportTicketCategory));
    if (!tc) throw validation("Categoria de solicitação inválida.", { supportTicketCategory: ["Escolha uma área da lista."] });
  }
  await assertAudienceRefs(db, input.audience);
  return cat;
}

function fields(input: AnnouncementInput, categoryId: string) {
  return {
    categoryId,
    title: input.title,
    summary: input.summary,
    body: input.body,
    coverImage: input.coverImage,
    effectiveNote: input.effectiveNote,
    highlights: input.highlights,
    tags: input.tags,
    supportTicketCategory: input.supportTicketCategory,
    isImportant: input.isImportant,
    requiresAck: input.requiresAck,
    isFeatured: input.isFeatured,
    authorLabel: input.authorLabel,
  };
}

async function replaceAudience(tx: Executor, id: string, input: AnnouncementInput) {
  await tx.delete(announcementAudiences).where(eq(announcementAudiences.announcementId, id));
  await tx.insert(announcementAudiences).values(toRules(input.audience).map((r) => ({ announcementId: id, ...r })));
}

/** Cria um rascunho. Publicação é uma ação separada (publishAnnouncement). */
export async function createAnnouncement(ctx: Ctx, input: AnnouncementInput) {
  requirePermission(ctx.actor, "announcement:manage");
  return getDb().transaction(async (tx) => {
    const cat = await resolveRefs(tx, input);
    const [row] = await tx
      .insert(announcements)
      .values({ ...fields(input, cat.id), status: "draft", authorUserId: ctx.actor.userId })
      .returning({ id: announcements.id });
    await replaceAudience(tx, row.id, input);
    await audit({ action: "announcement.created", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: row.id, meta: ctx.meta }, tx);
    return row;
  });
}

/**
 * Atualiza um comunicado. Em publicado/agendado, `relevantChange` incrementa a versão: leituras e ciências
 * passam a valer para a nova versão e o público é avisado de novo (se exigir ciência).
 */
export async function updateAnnouncement(ctx: Ctx, id: string, input: AnnouncementInput) {
  requirePermission(ctx.actor, "announcement:manage");
  return getDb().transaction(async (tx) => {
    const a = await findAnnouncement(id, tx);
    if (a.status === "archived") throw invalidTransition("Comunicados arquivados não podem ser editados. Restaure-o antes.");
    const cat = await resolveRefs(tx, input);
    const live = a.status === "published" || a.status === "scheduled";
    const bump = live && !!input.relevantChange;
    const [updated] = await tx
      .update(announcements)
      .set({ ...fields(input, cat.id), version: bump ? sql`${announcements.version} + 1` : announcements.version, updatedAt: new Date() })
      .where(and(eq(announcements.id, id), eq(announcements.version, a.version)))
      .returning();
    if (!updated) throw conflict("O comunicado foi alterado por outra pessoa. Recarregue a página.");
    await replaceAudience(tx, id, input);
    await audit({ action: "announcement.updated", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, metadata: { version: updated.version, relevantChange: bump }, meta: ctx.meta }, tx);
    if (bump && effectiveStatus(updated) === "published") {
      const users = await audienceUserIds(tx, "announcement_audiences", "announcement_id", id);
      await notify(users, { category: "comunicados", title: `Comunicado atualizado: ${updated.title}`, body: updated.requiresAck ? "Confirme a ciência da nova versão." : undefined, link: `/comunicados/${id}`, entityType: "announcement", entityId: id }, tx);
    }
    return updated;
  });
}

/** Publica agora (avisa o público) ou agenda para uma data futura. */
export async function publishAnnouncement(ctx: Ctx, id: string, opts: { mode: "now" | "schedule"; publishAt?: string; notify?: boolean }) {
  requirePermission(ctx.actor, "announcement:manage");
  return getDb().transaction(async (tx) => {
    const a = await findAnnouncement(id, tx);
    if (a.status === "published") throw invalidTransition("Este comunicado já está publicado.");
    const [{ n }] = await tx.select({ n: count() }).from(announcementAudiences).where(eq(announcementAudiences.announcementId, id));
    if (!n) throw validation("Defina o público antes de publicar.", { audience: ["Escolha quem vai receber o comunicado."] });
    if (opts.mode === "schedule") {
      const at = new Date(opts.publishAt!);
      await tx.update(announcements).set({ status: "scheduled", publishAt: at, publishedAt: at, archivedAt: null, updatedAt: new Date() }).where(eq(announcements.id, id));
      await audit({ action: "announcement.scheduled", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, metadata: { publishAt: at.toISOString() }, meta: ctx.meta }, tx);
      return { status: "scheduled" as const, publishAt: at };
    }
    const now = new Date();
    await tx.update(announcements).set({ status: "published", publishAt: null, publishedAt: now, archivedAt: null, updatedAt: now }).where(eq(announcements.id, id));
    await audit({ action: "announcement.published", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, meta: ctx.meta }, tx);
    if (opts.notify !== false) await notifyAudience(tx, a);
    return { status: "published" as const, publishedAt: now };
  });
}

async function notifyAudience(tx: Executor, a: { id: string; title: string; summary: string; isImportant: boolean }) {
  const users = await audienceUserIds(tx, "announcement_audiences", "announcement_id", a.id);
  await notify(users, { category: "comunicados", title: `${a.isImportant ? "Comunicado importante" : "Novo comunicado"}: ${a.title}`, body: a.summary, link: `/comunicados/${a.id}`, entityType: "announcement", entityId: a.id }, tx);
}

/**
 * Agendados cuja data chegou viram "publicados" e o público é avisado. Idempotente.
 * Executado pela manutenção diária e sempre que a gestão abre a lista de comunicados
 * (o colaborador já vê o comunicado na hora agendada — a regra de visibilidade considera a data).
 */
export async function publishDueAnnouncements(now = new Date()) {
  const db = getDb();
  const due = await db
    .update(announcements)
    .set({ status: "published", publishedAt: sql`coalesce(${announcements.publishAt}, now())`, updatedAt: now })
    .where(and(eq(announcements.status, "scheduled"), lte(announcements.publishAt, now)))
    .returning();
  for (const a of due) {
    await notifyAudience(db, a);
    await audit({ action: "announcement.published", actorUserId: null, entityType: "announcement", entityId: a.id, metadata: { scheduled: true } }, db);
  }
  return due.length;
}

export async function archiveAnnouncement(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const a = await findAnnouncement(id);
  if (a.status === "archived") return;
  if (a.status === "draft") throw invalidTransition("Rascunhos não são arquivados: exclua o rascunho se não for usá-lo.");
  await getDb().update(announcements).set({ status: "archived", archivedAt: new Date(), isFeatured: false, updatedAt: new Date() }).where(eq(announcements.id, id));
  await audit({ action: "announcement.archived", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, meta: ctx.meta });
}

/** Restaura um arquivado como rascunho (precisa ser publicado de novo). */
export async function restoreAnnouncement(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const a = await findAnnouncement(id);
  if (a.status !== "archived") throw invalidTransition("Só comunicados arquivados podem ser restaurados.");
  await getDb().update(announcements).set({ status: "draft", archivedAt: null, publishAt: null, updatedAt: new Date() }).where(eq(announcements.id, id));
  await audit({ action: "announcement.updated", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, metadata: { restored: true }, meta: ctx.meta });
}

/** Só rascunhos podem ser excluídos (publicados ficam no histórico — use arquivar). */
export async function deleteAnnouncement(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const a = await findAnnouncement(id);
  if (a.status !== "draft") throw invalidTransition("Somente rascunhos podem ser excluídos. Comunicados publicados podem ser arquivados.");
  await getDb().delete(announcements).where(eq(announcements.id, id));
  await audit({ action: "announcement.deleted", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, metadata: { title: a.title }, meta: ctx.meta });
}

/** Duplica como novo rascunho (útil para comunicados recorrentes). */
export async function duplicateAnnouncement(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const db = getDb();
  return db.transaction(async (tx) => {
    const a = await findAnnouncement(id, tx);
    const [copy] = await tx
      .insert(announcements)
      .values({
        categoryId: a.categoryId,
        title: `${a.title} (cópia)`.slice(0, 140),
        summary: a.summary,
        body: a.body,
        coverImage: a.coverImage,
        effectiveNote: a.effectiveNote,
        highlights: a.highlights,
        tags: a.tags,
        supportTicketCategory: a.supportTicketCategory,
        isImportant: a.isImportant,
        requiresAck: a.requiresAck,
        isFeatured: false,
        authorLabel: a.authorLabel,
        status: "draft",
        authorUserId: ctx.actor.userId,
      })
      .returning({ id: announcements.id });
    const rules = await tx.select({ type: announcementAudiences.type, refId: announcementAudiences.refId }).from(announcementAudiences).where(eq(announcementAudiences.announcementId, id));
    if (rules.length) await tx.insert(announcementAudiences).values(rules.map((r) => ({ announcementId: copy.id, ...r })));
    await audit({ action: "announcement.created", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: copy.id, metadata: { duplicatedFrom: id }, meta: ctx.meta }, tx);
    return copy;
  });
}

// ── Anexos ───────────────────────────────────────────────────────────────────

export async function addAnnouncementAttachments(ctx: Ctx, id: string, files: Array<{ name: string; bytes: Uint8Array }>) {
  requirePermission(ctx.actor, "announcement:manage");
  return getDb().transaction(async (tx) => {
    await findAnnouncement(id, tx);
    const [{ n }] = await tx.select({ n: count() }).from(announcementAttachments).where(eq(announcementAttachments.announcementId, id));
    if (n + files.length > MAX_ATTACHMENTS) throw validation(`Use no máximo ${MAX_ATTACHMENTS} anexos por comunicado.`);
    for (const [i, f] of files.entries()) {
      const stored = await storeUpload(f, ctx.actor.userId, tx);
      await tx.insert(announcementAttachments).values({ announcementId: id, fileId: stored.id, position: n + i });
    }
  });
}

export async function removeAnnouncementAttachment(ctx: Ctx, id: string, fileId: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const rows = await getDb()
    .delete(announcementAttachments)
    .where(and(eq(announcementAttachments.announcementId, id), eq(announcementAttachments.fileId, fileId)))
    .returning();
  if (!rows.length) throw notFound("Anexo");
  await getDb().update(fileAssets).set({ deletedAt: new Date() }).where(eq(fileAssets.id, fileId));
}

/** Download de anexo pela gestão (também em rascunhos). */
export async function openAnnouncementAttachmentAdmin(ctx: Ctx, id: string, fileId: string) {
  requirePermission(ctx.actor, "announcement:manage");
  const [row] = await getDb()
    .select({ asset: fileAssets })
    .from(announcementAttachments)
    .innerJoin(fileAssets, eq(fileAssets.id, announcementAttachments.fileId))
    .where(and(eq(announcementAttachments.announcementId, id), eq(announcementAttachments.fileId, fileId)));
  if (!row) throw notFound("Anexo");
  return row.asset;
}

// ── Relatório de leitura e ciência ───────────────────────────────────────────

export const REPORT_FILTERS = ["todos", "pendentes", "lidos", "cientes"] as const;
export type ReportFilter = (typeof REPORT_FILTERS)[number];

/** Quem do público leu e confirmou ciência da versão atual. Exige `announcement:report`. */
export async function readingReport(ctx: Ctx, id: string, opts: { filter?: ReportFilter; q?: string; page?: number; pageSize?: number } = {}) {
  requirePermission(ctx.actor, "announcement:report");
  const a = await findAnnouncement(id);
  const filter = opts.filter ?? "todos";
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const db = getDb();
  const inAudience = employeeInAudience("announcement_audiences", "announcement_id", id);
  const readAt = sql`(SELECT r.read_at FROM ${announcementReads} r WHERE r.announcement_id = ${id} AND r.user_id = e.user_id AND r.version = ${a.version})`;
  const ackAt = sql`(SELECT k.acknowledged_at FROM ${announcementAcknowledgements} k WHERE k.announcement_id = ${id} AND k.user_id = e.user_id AND k.version = ${a.version})`;
  const term = opts.q?.trim();
  const search: SQL = term ? sql`AND (f_unaccent(e.full_name) ILIKE f_unaccent(${`%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`}) OR e.registration_number = ${term})` : sql``;
  const pendingCond = a.requiresAck ? sql`${ackAt} IS NULL` : sql`${readAt} IS NULL`;
  const filterSql: SQL =
    filter === "pendentes" ? sql`AND ${pendingCond}` : filter === "lidos" ? sql`AND ${readAt} IS NOT NULL` : filter === "cientes" ? sql`AND ${ackAt} IS NOT NULL` : sql``;
  const baseFrom = sql`FROM employees e
    JOIN job_positions jp ON jp.id = e.job_position_id
    JOIN users u ON u.id = e.user_id
    JOIN units un ON un.id = e.unit_id
    JOIN departments d ON d.id = e.department_id
    WHERE e.status <> 'desligado' AND u.status = 'active' AND u.deleted_at IS NULL AND ${inAudience}`;
  const [rows, totals] = await Promise.all([
    db.execute<{ employee_id: string; name: string; registration: string; unit: string; department: string; position: string; read_at: Date | null; ack_at: Date | null }>(sql`
      SELECT e.id AS employee_id, e.full_name AS name, e.registration_number AS registration, un.name AS unit, d.name AS department, jp.title AS position,
             ${readAt} AS read_at, ${ackAt} AS ack_at
      ${baseFrom} ${search} ${filterSql}
      ORDER BY (${pendingCond}) DESC, e.full_name
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
    db.execute<{ audience: number; read: number; ack: number; filtered: number }>(sql`
      SELECT count(*)::int AS audience,
             count(*) FILTER (WHERE ${readAt} IS NOT NULL)::int AS read,
             count(*) FILTER (WHERE ${ackAt} IS NOT NULL)::int AS ack,
             count(*) FILTER (WHERE true ${search} ${filterSql})::int AS filtered
      ${baseFrom}`),
  ]);
  const t = totals.rows[0];
  return {
    announcement: { id: a.id, title: a.title, version: a.version, requiresAck: a.requiresAck, status: effectiveStatus(a), publishedAt: a.publishedAt ?? a.publishAt },
    totals: { audience: t.audience, read: t.read, acknowledged: t.ack },
    items: rows.rows.map((r) => ({ employeeId: r.employee_id, name: r.name, registration: r.registration, unit: r.unit, department: r.department, position: r.position, readAt: r.read_at ? new Date(r.read_at) : null, acknowledgedAt: r.ack_at ? new Date(r.ack_at) : null })),
    total: t.filtered,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(t.filtered / pageSize)),
  };
}

/** Relatório completo em CSV (separador ";" para abrir direto no Excel em pt-BR). Auditado. */
export async function readingReportCsv(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "report:export");
  const r = await readingReport(ctx, id, { pageSize: 100_000 });
  const fmt = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    ["Nome", "Matrícula", "Cargo", "Área", "Unidade", "Leu em", r.announcement.requiresAck ? "Ciência em" : null].filter(Boolean).join(";"),
    ...r.items.map((i) => [i.name, i.registration, i.position, i.department, i.unit, fmt(i.readAt), r.announcement.requiresAck ? fmt(i.acknowledgedAt) : null].filter((v) => v !== null).map((v) => esc(String(v))).join(";")),
  ];
  await audit({ action: "report.exported", actorUserId: ctx.actor.userId, entityType: "announcement", entityId: id, metadata: { report: "reading", rows: r.items.length }, meta: ctx.meta });
  return { filename: `leitura-comunicado-${id.slice(0, 8)}.csv`, csv: "﻿" + lines.join("\r\n") };
}

export async function announcementCategoryOptions() {
  return getDb().select({ slug: announcementCategories.slug, name: announcementCategories.name, color: announcementCategories.color, icon: announcementCategories.icon }).from(announcementCategories).orderBy(asc(announcementCategories.name));
}

export async function ticketCategoryOptions() {
  return getDb().select({ slug: ticketCategories.slug, name: ticketCategories.name }).from(ticketCategories).where(eq(ticketCategories.active, true)).orderBy(asc(ticketCategories.position));
}

