import { and, asc, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { audit } from "../audit";
import { requireEmployee, requirePermission, type Ctx } from "../auth/actor";
import { getDb } from "../db/client";
import {
  auditEvents,
  documentAcknowledgements,
  documentCategories,
  documents,
  documentSubmissionEvents,
  documentSubmissions,
  documentVersions,
  fileAssets,
  type SubmissionStatus,
} from "../db/schema";
import { conflict, invalidTransition, notFound, validation } from "../errors";
import { storeUpload } from "../files/storage";
import { textSearch, ref } from "./audience";

const categoryFields = { slug: documentCategories.slug, name: documentCategories.name, color: documentCategories.color, icon: documentCategories.icon, sensitive: documentCategories.sensitive };

const ackSql = (userId: string) =>
  sql<boolean>`EXISTS (SELECT 1 FROM ${documentAcknowledgements} k WHERE k.version_id = ${ref(documents.currentVersionId)} AND k.user_id = ${userId})`;

/** Escopo de documentos pessoais do ator — aplicado na query (impede IDOR). */
function ownPersonal(ctx: Ctx): SQL {
  const e = requireEmployee(ctx.actor);
  return and(eq(documents.scope, "personal"), eq(documents.ownerEmployeeId, e.id), isNull(documents.deletedAt), eq(documents.status, "active"))!;
}

function institutional(): SQL {
  return and(eq(documents.scope, "institutional"), isNull(documents.deletedAt), eq(documents.status, "active"), sql`(${documents.effectiveUntil} IS NULL OR ${documents.effectiveUntil} >= current_date)`)!;
}

export type DocumentStatusFilter = "todos" | "pendente" | "ciente";

export async function listMyDocuments(
  ctx: Ctx,
  opts: { q?: string; category?: string; year?: number; status?: DocumentStatusFilter; page?: number; pageSize?: number } = {},
) {
  requirePermission(ctx.actor, "document:read:own");
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 8;
  const userId = ctx.actor.userId;
  const where = and(
    ownPersonal(ctx),
    textSearch([documents.title], opts.q),
    opts.category ? eq(documentCategories.slug, opts.category) : undefined,
    opts.year ? sql`extract(year from ${documents.createdAt} AT TIME ZONE 'America/Sao_Paulo') = ${opts.year}` : undefined,
    opts.status === "pendente" ? and(eq(documents.requiresAck, true), sql`NOT ${ackSql(userId)}`) : undefined,
    opts.status === "ciente" ? ackSql(userId) : undefined,
  );
  const db = getDb();
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        referencePeriod: documents.referencePeriod,
        requiresAck: documents.requiresAck,
        createdAt: documents.createdAt,
        category: categoryFields,
        file: { mimeType: fileAssets.mimeType, sizeBytes: fileAssets.sizeBytes },
        acknowledged: ackSql(userId),
      })
      .from(documents)
      .innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId))
      .innerJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
      .innerJoin(fileAssets, eq(fileAssets.id, documentVersions.fileId))
      .where(where)
      .orderBy(desc(documents.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(documents).innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId)).where(where),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function myDocumentYears(ctx: Ctx) {
  requirePermission(ctx.actor, "document:read:own");
  const rows = await getDb()
    .selectDistinct({ year: sql<number>`extract(year from ${documents.createdAt} AT TIME ZONE 'America/Sao_Paulo')::int` })
    .from(documents)
    .where(ownPersonal(ctx));
  return rows.map((r) => r.year).sort((a, b) => b - a);
}

export async function pendingDocumentAcks(ctx: Ctx) {
  requirePermission(ctx.actor, "document:read:own");
  const userId = ctx.actor.userId;
  const [personal, policies] = await Promise.all([
    getDb().select({ n: count() }).from(documents).where(and(ownPersonal(ctx), eq(documents.requiresAck, true), sql`NOT ${ackSql(userId)}`)),
    getDb().select({ n: count() }).from(documents).where(and(institutional(), eq(documents.requiresAck, true), sql`NOT ${ackSql(userId)}`)),
  ]);
  return { personal: personal[0].n, policies: policies[0].n };
}

/** Documento acessível ao ator: pessoal próprio ou institucional vigente. */
async function findAccessibleDocument(ctx: Ctx, id: string) {
  const isPolicy = ctx.actor.permissions.has("policy:read");
  const own = ctx.actor.permissions.has("document:read:own") && ctx.actor.employee ? ownPersonal(ctx) : sql`false`;
  const [row] = await getDb()
    .select({
      id: documents.id,
      scope: documents.scope,
      title: documents.title,
      description: documents.description,
      referencePeriod: documents.referencePeriod,
      requiresAck: documents.requiresAck,
      effectiveFrom: documents.effectiveFrom,
      createdAt: documents.createdAt,
      currentVersionId: documents.currentVersionId,
      category: categoryFields,
    })
    .from(documents)
    .innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId))
    .where(and(eq(documents.id, id), sql`(${own} OR ${isPolicy ? institutional() : sql`false`})`))
    .limit(1);
  if (!row) throw notFound("Documento");
  return row;
}

export async function getDocument(ctx: Ctx, id: string) {
  const doc = await findAccessibleDocument(ctx, id);
  const db = getDb();
  const [versions, ack, history] = await Promise.all([
    db
      .select({ id: documentVersions.id, versionNumber: documentVersions.versionNumber, createdAt: documentVersions.createdAt, changeNote: documentVersions.changeNote, fileName: fileAssets.originalName, mimeType: fileAssets.mimeType, sizeBytes: fileAssets.sizeBytes })
      .from(documentVersions)
      .innerJoin(fileAssets, eq(fileAssets.id, documentVersions.fileId))
      .where(eq(documentVersions.documentId, id))
      .orderBy(desc(documentVersions.versionNumber)),
    db
      .select({ at: documentAcknowledgements.acknowledgedAt })
      .from(documentAcknowledgements)
      .where(and(eq(documentAcknowledgements.versionId, doc.currentVersionId!), eq(documentAcknowledgements.userId, ctx.actor.userId))),
    db
      .select({ action: auditEvents.action, createdAt: auditEvents.createdAt })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, "document"), eq(auditEvents.entityId, id), eq(auditEvents.actorUserId, ctx.actor.userId)))
      .orderBy(desc(auditEvents.createdAt))
      .limit(20),
  ]);
  const current = versions.find((v) => v.id === doc.currentVersionId) ?? versions[0];
  return { ...doc, versions, current, acknowledgedAt: ack[0]?.at ?? null, history };
}

/** Download/visualização com reautorização a cada acesso e auditoria (sem conteúdo nos logs). */
export async function openDocumentFile(ctx: Ctx, id: string, disposition: "inline" | "attachment") {
  const doc = await findAccessibleDocument(ctx, id);
  const [row] = await getDb()
    .select({ asset: fileAssets })
    .from(documentVersions)
    .innerJoin(fileAssets, eq(fileAssets.id, documentVersions.fileId))
    .where(eq(documentVersions.id, doc.currentVersionId!));
  if (!row) throw notFound("Arquivo");
  await audit({
    action: disposition === "inline" ? "document.viewed" : "document.downloaded",
    actorUserId: ctx.actor.userId,
    entityType: "document",
    entityId: id,
    metadata: { scope: doc.scope, category: doc.category.slug, sensitive: doc.category.sensitive },
    meta: ctx.meta,
  });
  return row.asset;
}

export async function acknowledgeDocument(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "document:acknowledge:own");
  const doc = await findAccessibleDocument(ctx, id);
  if (!doc.requiresAck) throw invalidTransition("Este documento não exige confirmação de ciência.");
  await getDb().transaction(async (tx) => {
    const inserted = await tx
      .insert(documentAcknowledgements)
      .values({ documentId: id, versionId: doc.currentVersionId!, userId: ctx.actor.userId })
      .onConflictDoNothing()
      .returning();
    if (inserted.length) {
      await audit({ action: "document.acknowledged", actorUserId: ctx.actor.userId, entityType: "document", entityId: id, metadata: { versionId: doc.currentVersionId }, meta: ctx.meta }, tx);
    }
  });
  return getDocument(ctx, id);
}

export async function listPolicies(ctx: Ctx, opts: { q?: string } = {}) {
  requirePermission(ctx.actor, "policy:read");
  return getDb()
    .select({
      id: documents.id,
      title: documents.title,
      description: documents.description,
      requiresAck: documents.requiresAck,
      effectiveFrom: documents.effectiveFrom,
      category: categoryFields,
      acknowledged: ackSql(ctx.actor.userId),
    })
    .from(documents)
    .innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId))
    .where(and(institutional(), textSearch([documents.title, documents.description], opts.q)))
    .orderBy(asc(documentCategories.position), asc(documents.title));
}

export async function submissionCategories() {
  return getDb()
    .select({ id: documentCategories.id, slug: documentCategories.slug, name: documentCategories.name, description: documentCategories.description, sensitive: documentCategories.sensitive })
    .from(documentCategories)
    .where(and(eq(documentCategories.kind, "submission"), eq(documentCategories.active, true)))
    .orderBy(asc(documentCategories.position));
}

export async function personalCategories() {
  return getDb()
    .select({ slug: documentCategories.slug, name: documentCategories.name })
    .from(documentCategories)
    .where(and(eq(documentCategories.kind, "personal"), eq(documentCategories.active, true)))
    .orderBy(asc(documentCategories.position));
}

// ── Envio de documentos pelo colaborador ──────────────────────────────────────

export async function listMySubmissions(ctx: Ctx, opts: { status?: SubmissionStatus; limit?: number } = {}) {
  requirePermission(ctx.actor, "document:submit:own");
  const e = requireEmployee(ctx.actor);
  return getDb()
    .select({
      id: documentSubmissions.id,
      number: documentSubmissions.number,
      title: documentSubmissions.title,
      status: documentSubmissions.status,
      reviewNote: documentSubmissions.reviewNote,
      referenceDate: documentSubmissions.referenceDate,
      createdAt: documentSubmissions.createdAt,
      reviewedAt: documentSubmissions.reviewedAt,
      category: { slug: documentCategories.slug, name: documentCategories.name },
      fileName: fileAssets.originalName,
      sizeBytes: fileAssets.sizeBytes,
    })
    .from(documentSubmissions)
    .innerJoin(documentCategories, eq(documentCategories.id, documentSubmissions.categoryId))
    .innerJoin(fileAssets, eq(fileAssets.id, documentSubmissions.fileId))
    .where(and(eq(documentSubmissions.employeeId, e.id), opts.status ? eq(documentSubmissions.status, opts.status) : undefined))
    .orderBy(desc(documentSubmissions.createdAt))
    .limit(opts.limit ?? 50);
}

async function findOwnSubmission(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "document:submit:own");
  const e = requireEmployee(ctx.actor);
  const [row] = await getDb()
    .select()
    .from(documentSubmissions)
    .where(and(eq(documentSubmissions.id, id), eq(documentSubmissions.employeeId, e.id)))
    .limit(1);
  if (!row) throw notFound("Envio");
  return row;
}

export async function getMySubmission(ctx: Ctx, id: string) {
  const sub = await findOwnSubmission(ctx, id);
  const db = getDb();
  const [cat, file, events] = await Promise.all([
    db.select({ slug: documentCategories.slug, name: documentCategories.name }).from(documentCategories).where(eq(documentCategories.id, sub.categoryId)),
    db.select({ name: fileAssets.originalName, mimeType: fileAssets.mimeType, sizeBytes: fileAssets.sizeBytes, scanStatus: fileAssets.scanStatus }).from(fileAssets).where(eq(fileAssets.id, sub.fileId)),
    db
      .select({ fromStatus: documentSubmissionEvents.fromStatus, toStatus: documentSubmissionEvents.toStatus, note: documentSubmissionEvents.note, createdAt: documentSubmissionEvents.createdAt })
      .from(documentSubmissionEvents)
      .where(eq(documentSubmissionEvents.submissionId, id))
      .orderBy(asc(documentSubmissionEvents.createdAt)),
  ]);
  return { ...sub, category: cat[0], file: file[0], events };
}

export async function createSubmission(
  ctx: Ctx,
  input: { categorySlug: string; title: string; notes?: string; referenceDate?: string; file: { name: string; bytes: Uint8Array } },
) {
  requirePermission(ctx.actor, "document:submit:own");
  const e = requireEmployee(ctx.actor);
  const db = getDb();
  const [cat] = await db
    .select()
    .from(documentCategories)
    .where(and(eq(documentCategories.slug, input.categorySlug), eq(documentCategories.kind, "submission"), eq(documentCategories.active, true)));
  if (!cat) throw validation("Verifique os campos.", { categorySlug: ["Escolha um tipo de documento válido."] });

  return db.transaction(async (tx) => {
    const file = await storeUpload(input.file, ctx.actor.userId, tx);
    const [sub] = await tx
      .insert(documentSubmissions)
      .values({ employeeId: e.id, categoryId: cat.id, title: input.title, notes: input.notes || null, referenceDate: input.referenceDate || null, fileId: file.id })
      .returning();
    await tx.insert(documentSubmissionEvents).values({ submissionId: sub.id, toStatus: "enviado", actorUserId: ctx.actor.userId });
    await audit({ action: "submission.created", actorUserId: ctx.actor.userId, entityType: "document_submission", entityId: sub.id, metadata: { category: cat.slug, sizeBytes: file.sizeBytes, mimeType: file.mimeType }, meta: ctx.meta }, tx);
    return { id: sub.id, number: sub.number, status: sub.status };
  });
}

/** O colaborador só cancela enquanto o RH não iniciou a análise (controle otimista por versão). */
export async function cancelSubmission(ctx: Ctx, id: string) {
  const sub = await findOwnSubmission(ctx, id);
  if (sub.status !== "enviado") throw invalidTransition("Este envio já está em análise e não pode mais ser cancelado.");
  await getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(documentSubmissions)
      .set({ status: "cancelado", version: sql`${documentSubmissions.version} + 1` })
      .where(and(eq(documentSubmissions.id, id), eq(documentSubmissions.version, sub.version), eq(documentSubmissions.status, "enviado")))
      .returning();
    if (!updated) throw conflict("O envio foi atualizado por outra pessoa. Recarregue a página.");
    await tx.insert(documentSubmissionEvents).values({ submissionId: id, fromStatus: "enviado", toStatus: "cancelado", actorUserId: ctx.actor.userId });
    await audit({ action: "submission.cancelled", actorUserId: ctx.actor.userId, entityType: "document_submission", entityId: id, meta: ctx.meta }, tx);
  });
}

export async function openSubmissionFile(ctx: Ctx, id: string) {
  const sub = await findOwnSubmission(ctx, id);
  const [asset] = await getDb().select().from(fileAssets).where(eq(fileAssets.id, sub.fileId));
  await audit({ action: "submission.file_downloaded", actorUserId: ctx.actor.userId, entityType: "document_submission", entityId: id, meta: ctx.meta });
  return asset;
}

// ── Histórico unificado ───────────────────────────────────────────────────────

export type HistoryEntry = { at: Date; kind: "recebido" | "enviado" | "status" | "ciencia" | "download" | "visualizacao"; title: string; detail?: string; href?: string };

export async function documentHistory(ctx: Ctx, limit = 40): Promise<HistoryEntry[]> {
  requirePermission(ctx.actor, "document:read:own");
  const e = requireEmployee(ctx.actor);
  const db = getDb();
  const [received, subEvents, acks, access] = await Promise.all([
    db.select({ id: documents.id, title: documents.title, at: documents.createdAt }).from(documents).where(ownPersonal(ctx)).orderBy(desc(documents.createdAt)).limit(limit),
    db
      .select({ id: documentSubmissions.id, title: documentSubmissions.title, toStatus: documentSubmissionEvents.toStatus, note: documentSubmissionEvents.note, at: documentSubmissionEvents.createdAt })
      .from(documentSubmissionEvents)
      .innerJoin(documentSubmissions, eq(documentSubmissions.id, documentSubmissionEvents.submissionId))
      .where(eq(documentSubmissions.employeeId, e.id))
      .orderBy(desc(documentSubmissionEvents.createdAt))
      .limit(limit),
    db
      .select({ id: documents.id, title: documents.title, at: documentAcknowledgements.acknowledgedAt })
      .from(documentAcknowledgements)
      .innerJoin(documents, eq(documents.id, documentAcknowledgements.documentId))
      .where(eq(documentAcknowledgements.userId, ctx.actor.userId))
      .orderBy(desc(documentAcknowledgements.acknowledgedAt))
      .limit(limit),
    db
      .select({ id: documents.id, title: documents.title, action: auditEvents.action, at: auditEvents.createdAt })
      .from(auditEvents)
      .innerJoin(documents, sql`${documents.id}::text = ${auditEvents.entityId}`)
      .where(and(eq(auditEvents.actorUserId, ctx.actor.userId), eq(auditEvents.entityType, "document"), inArray(auditEvents.action, ["document.downloaded", "document.viewed"])))
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit),
  ]);
  const STATUS_LABEL: Record<SubmissionStatus, string> = { enviado: "Enviado", em_analise: "Em análise", aceito: "Aceito", recusado: "Recusado", cancelado: "Cancelado" };
  const entries: HistoryEntry[] = [
    ...received.map((r) => ({ at: r.at, kind: "recebido" as const, title: r.title, detail: "Documento recebido", href: `/documentos/${r.id}` })),
    ...subEvents.map((s) => ({
      at: s.at,
      kind: s.toStatus === "enviado" ? ("enviado" as const) : ("status" as const),
      title: s.title,
      detail: s.toStatus === "enviado" ? "Você enviou ao RH" : `Situação: ${STATUS_LABEL[s.toStatus]}${s.note ? ` — ${s.note}` : ""}`,
      href: `/documentos/envios/${s.id}`,
    })),
    ...acks.map((a) => ({ at: a.at, kind: "ciencia" as const, title: a.title, detail: "Você confirmou ciência", href: `/documentos/${a.id}` })),
    ...access.map((a) => ({ at: a.at, kind: a.action === "document.viewed" ? ("visualizacao" as const) : ("download" as const), title: a.title, detail: a.action === "document.viewed" ? "Você visualizou" : "Você baixou", href: `/documentos/${a.id}` })),
  ];
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export type RecentDocument = { id: string; title: string; mimeType: string; at: Date; kind: "recebido" | "atualizado" };

/** "Meus documentos recentes" da Home: recebidos pelo colaborador + normas/manuais atualizados recentemente. */
export async function recentDocuments(ctx: Ctx, limit = 3): Promise<RecentDocument[]> {
  const personal = (await listMyDocuments(ctx, { pageSize: limit })).items.map((d) => ({
    id: d.id,
    title: d.title,
    mimeType: d.file.mimeType,
    at: d.createdAt,
    kind: "recebido" as const,
  }));
  const policies = ctx.actor.permissions.has("policy:read")
    ? (
        await getDb()
          .select({ id: documents.id, title: documents.title, mimeType: fileAssets.mimeType, at: documentVersions.createdAt })
          .from(documents)
          .innerJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
          .innerJoin(fileAssets, eq(fileAssets.id, documentVersions.fileId))
          .where(and(institutional(), sql`${documentVersions.createdAt} > now() - interval '60 days'`))
          .orderBy(desc(documentVersions.createdAt))
          .limit(limit)
      ).map((d) => ({ ...d, kind: "atualizado" as const }))
    : [];
  return [...personal, ...policies].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
