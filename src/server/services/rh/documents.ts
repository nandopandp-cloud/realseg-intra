import { and, asc, count, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { can, requirePermission, type Ctx } from "../../auth/actor";
import { getDb, type Executor } from "../../db/client";
import {
  auditEvents,
  departments,
  documentAcknowledgements,
  documentCategories,
  documents,
  documentSubmissionEvents,
  documentSubmissions,
  documentVersions,
  employees,
  fileAssets,
  jobPositions,
  units,
  type SubmissionStatus,
} from "../../db/schema";
import { conflict, invalidTransition, notFound, validation } from "../../errors";
import { storeUpload } from "../../files/storage";
import { textSearch } from "../audience";
import { notify } from "../notifications";

type Upload = { name: string; bytes: Uint8Array };
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** "2026-09" → "Setembro/2026" (competência exibida no título dos holerites). */
export function periodLabel(period: string | null | undefined) {
  const m = period?.match(/^(\d{4})-(\d{2})$/);
  return m ? `${MONTHS[Number(m[2]) - 1]}/${m[1]}` : (period ?? "");
}

// ── Envios dos colaboradores (análise) ───────────────────────────────────────

export const SUBMISSION_TABS = ["analisar", "aceitos", "recusados", "todos"] as const;
export type SubmissionTab = (typeof SUBMISSION_TABS)[number];
const TAB_STATUSES: Record<Exclude<SubmissionTab, "todos">, SubmissionStatus[]> = { analisar: ["enviado", "em_analise"], aceitos: ["aceito"], recusados: ["recusado"] };

export async function listSubmissionsAdmin(ctx: Ctx, opts: { tab?: SubmissionTab; q?: string; category?: string; page?: number; pageSize?: number } = {}) {
  requirePermission(ctx.actor, "submission:review");
  const tab = opts.tab ?? "analisar";
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const qn = opts.q?.replace(/^DOC-/i, "").trim() ?? "";
  const base = and(
    opts.q ? or(textSearch([documentSubmissions.title, employees.fullName], opts.q), eq(employees.registrationNumber, opts.q.trim()), /^\d{1,9}$/.test(qn) ? eq(documentSubmissions.number, Number(qn)) : undefined) : undefined,
    opts.category ? eq(documentCategories.slug, opts.category) : undefined,
  );
  const where = and(base, tab === "todos" ? undefined : inArray(documentSubmissions.status, TAB_STATUSES[tab]));
  const db = getDb();
  const [items, [{ n: total }], [counts]] = await Promise.all([
    db
      .select({
        id: documentSubmissions.id,
        number: documentSubmissions.number,
        title: documentSubmissions.title,
        status: documentSubmissions.status,
        createdAt: documentSubmissions.createdAt,
        reviewedAt: documentSubmissions.reviewedAt,
        referenceDate: documentSubmissions.referenceDate,
        category: { name: documentCategories.name, sensitive: documentCategories.sensitive },
        employee: { name: employees.fullName, registration: employees.registrationNumber },
      })
      .from(documentSubmissions)
      .innerJoin(employees, eq(employees.id, documentSubmissions.employeeId))
      .innerJoin(documentCategories, eq(documentCategories.id, documentSubmissions.categoryId))
      .where(where)
      .orderBy(tab === "analisar" ? asc(documentSubmissions.createdAt) : desc(documentSubmissions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ n: count() })
      .from(documentSubmissions)
      .innerJoin(employees, eq(employees.id, documentSubmissions.employeeId))
      .innerJoin(documentCategories, eq(documentCategories.id, documentSubmissions.categoryId))
      .where(where),
    db
      .select({
        analisar: sql<number>`count(*) FILTER (WHERE ${documentSubmissions.status} IN ('enviado','em_analise'))`.mapWith(Number),
        aceitos: sql<number>`count(*) FILTER (WHERE ${documentSubmissions.status} = 'aceito')`.mapWith(Number),
        recusados: sql<number>`count(*) FILTER (WHERE ${documentSubmissions.status} = 'recusado')`.mapWith(Number),
        todos: count(),
      })
      .from(documentSubmissions)
      .innerJoin(employees, eq(employees.id, documentSubmissions.employeeId))
      .innerJoin(documentCategories, eq(documentCategories.id, documentSubmissions.categoryId))
      .where(base),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts };
}

export async function getSubmissionAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "submission:review");
  const db = getDb();
  const [row] = await db
    .select({
      s: documentSubmissions,
      category: { name: documentCategories.name, sensitive: documentCategories.sensitive },
      employee: { id: employees.id, userId: employees.userId, name: employees.fullName, registration: employees.registrationNumber, department: departments.name, unit: units.name, position: jobPositions.title },
      file: { name: fileAssets.originalName, mimeType: fileAssets.mimeType, sizeBytes: fileAssets.sizeBytes, scanStatus: fileAssets.scanStatus },
    })
    .from(documentSubmissions)
    .innerJoin(documentCategories, eq(documentCategories.id, documentSubmissions.categoryId))
    .innerJoin(employees, eq(employees.id, documentSubmissions.employeeId))
    .innerJoin(departments, eq(departments.id, employees.departmentId))
    .innerJoin(units, eq(units.id, employees.unitId))
    .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
    .innerJoin(fileAssets, eq(fileAssets.id, documentSubmissions.fileId))
    .where(eq(documentSubmissions.id, id))
    .limit(1);
  if (!row) throw notFound("Envio");
  const [events, others] = await Promise.all([
    db
      .select({ fromStatus: documentSubmissionEvents.fromStatus, toStatus: documentSubmissionEvents.toStatus, note: documentSubmissionEvents.note, createdAt: documentSubmissionEvents.createdAt, actorName: employees.fullName })
      .from(documentSubmissionEvents)
      .leftJoin(employees, eq(employees.userId, documentSubmissionEvents.actorUserId))
      .where(eq(documentSubmissionEvents.submissionId, id))
      .orderBy(asc(documentSubmissionEvents.createdAt)),
    db
      .select({ id: documentSubmissions.id, number: documentSubmissions.number, title: documentSubmissions.title, status: documentSubmissions.status, createdAt: documentSubmissions.createdAt })
      .from(documentSubmissions)
      .where(and(eq(documentSubmissions.employeeId, row.employee.id), ne(documentSubmissions.id, id)))
      .orderBy(desc(documentSubmissions.createdAt))
      .limit(5),
  ]);
  return { ...row.s, category: row.category, employee: row.employee, file: row.file, events, others };
}

/** Análise: iniciar (enviado → em análise), aceitar ou recusar (com motivo). Controle otimista por versão. */
export async function reviewSubmission(ctx: Ctx, id: string, input: { action: "start" | "accept" | "refuse"; note?: string; version: number }) {
  requirePermission(ctx.actor, "submission:review");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(documentSubmissions).where(eq(documentSubmissions.id, id)).limit(1);
    if (!s) throw notFound("Envio");
    const to: SubmissionStatus = input.action === "start" ? "em_analise" : input.action === "accept" ? "aceito" : "recusado";
    const allowed = input.action === "start" ? s.status === "enviado" : s.status === "enviado" || s.status === "em_analise";
    if (!allowed) throw invalidTransition(s.status === "cancelado" ? "O colaborador cancelou este envio." : "Este envio já foi analisado.");
    if (input.action === "refuse" && !input.note?.trim()) throw validation("Informe o motivo da recusa.", { note: ["Explique ao colaborador o que precisa ser corrigido."] });
    const done = to !== "em_analise";
    const [updated] = await tx
      .update(documentSubmissions)
      .set({
        status: to,
        reviewerUserId: ctx.actor.userId,
        ...(done ? { reviewNote: input.note?.trim() || null, reviewedAt: new Date() } : {}),
        version: sql`${documentSubmissions.version} + 1`,
      })
      .where(and(eq(documentSubmissions.id, id), eq(documentSubmissions.version, input.version)))
      .returning();
    if (!updated) throw conflict("O envio foi atualizado por outra pessoa. Recarregue a página.");
    await tx.insert(documentSubmissionEvents).values({ submissionId: id, fromStatus: s.status, toStatus: to, actorUserId: ctx.actor.userId, note: input.note?.trim() || null });
    await audit({ action: "submission.reviewed", actorUserId: ctx.actor.userId, entityType: "document_submission", entityId: id, metadata: { from: s.status, to }, meta: ctx.meta }, tx);
    const [emp] = await tx.select({ userId: employees.userId }).from(employees).where(eq(employees.id, s.employeeId));
    const text = to === "aceito" ? "foi aceito pelo RH" : to === "recusado" ? "precisa de correção" : "está em análise";
    await notify([emp.userId], { category: "documentos", title: `Envio DOC-${s.number} ${text}`, link: `/documentos/envios/${id}`, entityType: "document_submission", entityId: id }, tx);
    return updated;
  });
}

export async function openSubmissionFileAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "submission:review");
  const [row] = await getDb().select({ asset: fileAssets }).from(documentSubmissions).innerJoin(fileAssets, eq(fileAssets.id, documentSubmissions.fileId)).where(eq(documentSubmissions.id, id));
  if (!row) throw notFound("Envio");
  await audit({ action: "submission.file_downloaded", actorUserId: ctx.actor.userId, entityType: "document_submission", entityId: id, metadata: { by: "rh" }, meta: ctx.meta });
  return row.asset;
}

// ── Distribuição de documentos pessoais ──────────────────────────────────────

export async function documentCategoryOptions(kind: "personal" | "institutional") {
  return getDb()
    .select({ slug: documentCategories.slug, name: documentCategories.name, sensitive: documentCategories.sensitive, description: documentCategories.description })
    .from(documentCategories)
    .where(and(eq(documentCategories.kind, kind), eq(documentCategories.active, true)))
    .orderBy(asc(documentCategories.position));
}

async function categoryOf(db: Executor, slug: string, kind: "personal" | "institutional") {
  const [c] = await db.select().from(documentCategories).where(and(eq(documentCategories.slug, slug), eq(documentCategories.kind, kind), eq(documentCategories.active, true)));
  if (!c) throw validation("Tipo de documento inválido.", { categorySlug: ["Escolha um tipo da lista."] });
  return c;
}

/** Cria o documento lógico + versão 1 (o arquivo vai para o armazenamento privado). */
async function createDocumentWithFile(
  tx: Executor,
  ctx: Ctx,
  values: Omit<typeof documents.$inferInsert, "currentVersionId" | "createdByUserId">,
  file: Upload,
) {
  const stored = await storeUpload(file, ctx.actor.userId, tx);
  const [doc] = await tx.insert(documents).values({ ...values, createdByUserId: ctx.actor.userId }).returning();
  const [ver] = await tx.insert(documentVersions).values({ documentId: doc.id, versionNumber: 1, fileId: stored.id, createdByUserId: ctx.actor.userId }).returning();
  await tx.update(documents).set({ currentVersionId: ver.id }).where(eq(documents.id, doc.id));
  return { ...doc, currentVersionId: ver.id };
}

/** Documento pessoal para um colaborador (holerite, declaração, aviso individual…). Avisa o colaborador. */
export async function distributePersonalDocument(
  ctx: Ctx,
  input: { employeeId: string; categorySlug: string; title?: string; description?: string | null; referencePeriod?: string | null; requiresAck: boolean; file: Upload },
) {
  requirePermission(ctx.actor, "document:manage");
  return getDb().transaction(async (tx) => {
    const cat = await categoryOf(tx, input.categorySlug, "personal");
    const [emp] = await tx.select().from(employees).where(and(eq(employees.id, input.employeeId), ne(employees.status, "desligado")));
    if (!emp) throw validation("Colaborador inválido.", { employeeId: ["Escolha um colaborador ativo."] });
    const title = input.title?.trim() || `${cat.name}${input.referencePeriod ? ` - ${periodLabel(input.referencePeriod)}` : ""}`;
    const doc = await createDocumentWithFile(
      tx,
      ctx,
      { categoryId: cat.id, scope: "personal", ownerEmployeeId: emp.id, title, description: input.description || null, referencePeriod: input.referencePeriod || null, requiresAck: input.requiresAck },
      input.file,
    );
    await audit({ action: "document.distributed", actorUserId: ctx.actor.userId, entityType: "document", entityId: doc.id, metadata: { category: cat.slug, ownerEmployeeId: emp.id }, meta: ctx.meta }, tx);
    // Título da notificação sem dados sensíveis (só o tipo/competência, nunca valores).
    await notify([emp.userId], { category: "documentos", title: `Novo documento disponível: ${title}`, body: input.requiresAck ? "Confirme a ciência após a leitura." : undefined, link: `/documentos/${doc.id}`, entityType: "document", entityId: doc.id }, tx);
    return { id: doc.id, title };
  });
}

/**
 * Prévia da distribuição em lote: cada arquivo é associado ao colaborador cuja matrícula aparece no nome
 * (ex.: "100231_holerite_09-2026.pdf"). Nomes sem matrícula conhecida, ambíguos ou repetidos não são enviados.
 */
export async function matchBatchFiles(ctx: Ctx, names: string[]) {
  requirePermission(ctx.actor, "document:manage");
  const candidates = names.map((name) => ({ name, numbers: [...new Set(name.match(/\d{4,10}/g) ?? [])] }));
  const all = [...new Set(candidates.flatMap((c) => c.numbers))];
  const found = all.length
    ? await getDb()
        .select({ id: employees.id, name: employees.fullName, registration: employees.registrationNumber, status: employees.status })
        .from(employees)
        .where(inArray(employees.registrationNumber, all))
    : [];
  const byReg = new Map(found.map((e) => [e.registration, e]));
  const seen = new Map<string, number>();
  const out = candidates.map((c) => {
    const matches = c.numbers.map((n) => byReg.get(n)).filter((e): e is NonNullable<typeof e> => !!e);
    if (matches.length === 0)
      return { name: c.name, ok: false as const, reason: c.numbers.length ? `Matrícula ${c.numbers.join(", ")} não cadastrada.` : "Nenhuma matrícula encontrada no nome do arquivo." };
    if (matches.length > 1) return { name: c.name, ok: false as const, reason: "Mais de uma matrícula no nome do arquivo." };
    const e = matches[0];
    if (e.status === "desligado") return { name: c.name, ok: false as const, reason: `${e.name} está desligado(a).` };
    seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
    return { name: c.name, ok: true as const, employee: { id: e.id, name: e.name, registration: e.registration } };
  });
  return out.map((r) => (r.ok && (seen.get(r.employee.id) ?? 0) > 1 ? { name: r.name, ok: false as const, reason: `Mais de um arquivo para ${r.employee.name}.` } : r));
}

export const PERSONAL_FILTERS = ["todos", "pendentes", "cientes"] as const;

/** Documentos pessoais distribuídos (todos os colaboradores). */
export async function listPersonalAdmin(ctx: Ctx, opts: { q?: string; category?: string; filter?: (typeof PERSONAL_FILTERS)[number]; page?: number; pageSize?: number } = {}) {
  requirePermission(ctx.actor, "document:read:any");
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const acked = sql`EXISTS (SELECT 1 FROM ${documentAcknowledgements} k WHERE k.version_id = ${documents.currentVersionId} AND k.user_id = ${employees.userId})`;
  const where = and(
    eq(documents.scope, "personal"),
    isNull(documents.deletedAt),
    opts.q ? or(textSearch([documents.title, employees.fullName], opts.q), eq(employees.registrationNumber, opts.q.trim())) : undefined,
    opts.category ? eq(documentCategories.slug, opts.category) : undefined,
    opts.filter === "pendentes" ? and(eq(documents.requiresAck, true), sql`NOT ${acked}`) : opts.filter === "cientes" ? and(eq(documents.requiresAck, true), acked) : undefined,
  );
  const db = getDb();
  const [items, [{ n: total }]] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        status: documents.status,
        referencePeriod: documents.referencePeriod,
        requiresAck: documents.requiresAck,
        createdAt: documents.createdAt,
        acknowledged: sql<boolean>`${acked}`,
        category: { name: documentCategories.name, sensitive: documentCategories.sensitive },
        employee: { name: employees.fullName, registration: employees.registrationNumber },
      })
      .from(documents)
      .innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId))
      .innerJoin(employees, eq(employees.id, documents.ownerEmployeeId))
      .where(where)
      .orderBy(desc(documents.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(documents).innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId)).innerJoin(employees, eq(employees.id, documents.ownerEmployeeId)).where(where),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

// ── Normas e manuais (institucionais) ────────────────────────────────────────

const activeEmployeesCount = sql<number>`(SELECT count(*) FROM employees e JOIN users u ON u.id = e.user_id WHERE e.status <> 'desligado' AND u.status = 'active' AND u.deleted_at IS NULL)`.mapWith(Number);

export async function listInstitutionalAdmin(ctx: Ctx, opts: { q?: string; status?: "active" | "archived" } = {}) {
  requirePermission(ctx.actor, "document:manage");
  return getDb()
    .select({
      id: documents.id,
      title: documents.title,
      description: documents.description,
      status: documents.status,
      requiresAck: documents.requiresAck,
      effectiveFrom: documents.effectiveFrom,
      effectiveUntil: documents.effectiveUntil,
      updatedAt: documents.updatedAt,
      category: { name: documentCategories.name, icon: documentCategories.icon },
      version: sql<number>`(SELECT v.version_number FROM ${documentVersions} v WHERE v.id = ${documents.currentVersionId})`.mapWith(Number),
      ackCount: sql<number>`(SELECT count(*) FROM ${documentAcknowledgements} k WHERE k.version_id = ${documents.currentVersionId})`.mapWith(Number),
      audience: activeEmployeesCount,
    })
    .from(documents)
    .innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId))
    .where(and(eq(documents.scope, "institutional"), isNull(documents.deletedAt), eq(documents.status, opts.status ?? "active"), textSearch([documents.title, documents.description], opts.q)))
    .orderBy(asc(documentCategories.position), asc(documents.title));
}

export async function createInstitutionalDocument(
  ctx: Ctx,
  input: { categorySlug: string; title: string; description?: string | null; requiresAck: boolean; effectiveFrom?: string | null; effectiveUntil?: string | null; file: Upload; notify?: boolean },
) {
  requirePermission(ctx.actor, "document:manage");
  return getDb().transaction(async (tx) => {
    const cat = await categoryOf(tx, input.categorySlug, "institutional");
    const doc = await createDocumentWithFile(
      tx,
      ctx,
      { categoryId: cat.id, scope: "institutional", title: input.title, description: input.description || null, requiresAck: input.requiresAck, effectiveFrom: input.effectiveFrom || null, effectiveUntil: input.effectiveUntil || null },
      input.file,
    );
    await audit({ action: "document.distributed", actorUserId: ctx.actor.userId, entityType: "document", entityId: doc.id, metadata: { category: cat.slug, scope: "institutional" }, meta: ctx.meta }, tx);
    if (input.notify) await notifyEveryone(tx, { title: `Nova norma disponível: ${input.title}`, requiresAck: input.requiresAck, id: doc.id });
    return { id: doc.id };
  });
}

async function notifyEveryone(tx: Executor, d: { title: string; requiresAck: boolean; id: string }) {
  const r = await tx.execute<{ user_id: string }>(sql`SELECT e.user_id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.status <> 'desligado' AND u.status = 'active' AND u.deleted_at IS NULL`);
  await notify(
    r.rows.map((x) => x.user_id),
    { category: "documentos", title: d.title, body: d.requiresAck ? "Leia e confirme a ciência." : undefined, link: `/documentos/${d.id}`, entityType: "document", entityId: d.id },
    tx,
  );
}

// ── Documento (qualquer escopo): detalhe, edição, nova versão, arquivo ───────

async function findDoc(id: string, db: Executor = getDb()) {
  const [d] = await db.select().from(documents).where(and(eq(documents.id, id), isNull(documents.deletedAt))).limit(1);
  if (!d) throw notFound("Documento");
  return d;
}

export async function getDocumentAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "document:read:any");
  const db = getDb();
  const d = await findDoc(id);
  const [[cat], owner, versions, accesses] = await Promise.all([
    db.select().from(documentCategories).where(eq(documentCategories.id, d.categoryId)),
    d.ownerEmployeeId
      ? db
          .select({ id: employees.id, userId: employees.userId, name: employees.fullName, registration: employees.registrationNumber, department: departments.name, unit: units.name })
          .from(employees)
          .innerJoin(departments, eq(departments.id, employees.departmentId))
          .innerJoin(units, eq(units.id, employees.unitId))
          .where(eq(employees.id, d.ownerEmployeeId))
          .then((r) => r[0] ?? null)
      : null,
    db
      .select({ id: documentVersions.id, versionNumber: documentVersions.versionNumber, changeNote: documentVersions.changeNote, createdAt: documentVersions.createdAt, fileName: fileAssets.originalName, sizeBytes: fileAssets.sizeBytes, mimeType: fileAssets.mimeType })
      .from(documentVersions)
      .innerJoin(fileAssets, eq(fileAssets.id, documentVersions.fileId))
      .where(eq(documentVersions.documentId, id))
      .orderBy(desc(documentVersions.versionNumber)),
    // Acessos do próprio dono (pessoal) — para saber se o colaborador abriu o documento.
    db
      .select({ action: auditEvents.action, at: auditEvents.createdAt, actorUserId: auditEvents.actorUserId })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, "document"), eq(auditEvents.entityId, id), inArray(auditEvents.action, ["document.viewed", "document.downloaded", "document.acknowledged"])))
      .orderBy(desc(auditEvents.createdAt))
      .limit(50),
  ]);
  const ackRows = await db
    .select({ userId: documentAcknowledgements.userId, at: documentAcknowledgements.acknowledgedAt })
    .from(documentAcknowledgements)
    .where(eq(documentAcknowledgements.versionId, d.currentVersionId!));
  const ownerAck = owner ? (ackRows.find((a) => a.userId === owner.userId)?.at ?? null) : null;
  const ownerAccess = owner ? accesses.filter((a) => a.actorUserId === owner.userId) : [];
  const [{ audience }] = d.scope === "institutional" ? await db.select({ audience: activeEmployeesCount }).from(documents).limit(1) : [{ audience: 1 }];
  return {
    ...d,
    category: { slug: cat.slug, name: cat.name, sensitive: cat.sensitive },
    owner,
    versions,
    current: versions.find((v) => v.id === d.currentVersionId) ?? versions[0],
    ack: { count: ackRows.length, audience, ownerAckAt: ownerAck },
    ownerFirstAccess: ownerAccess.length ? ownerAccess[ownerAccess.length - 1].at : null,
    canManage: can(ctx.actor, "document:manage"),
  };
}

export async function updateDocumentMeta(
  ctx: Ctx,
  id: string,
  input: { title: string; description?: string | null; referencePeriod?: string | null; requiresAck: boolean; effectiveFrom?: string | null; effectiveUntil?: string | null },
) {
  requirePermission(ctx.actor, "document:manage");
  const d = await findDoc(id);
  if (d.status === "archived") throw invalidTransition("Documento arquivado. Restaure-o para editar.");
  await getDb()
    .update(documents)
    .set({
      title: input.title,
      description: input.description || null,
      referencePeriod: d.scope === "personal" ? input.referencePeriod || null : null,
      requiresAck: input.requiresAck,
      effectiveFrom: d.scope === "institutional" ? input.effectiveFrom || null : d.effectiveFrom,
      effectiveUntil: d.scope === "institutional" ? input.effectiveUntil || null : d.effectiveUntil,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id));
  await audit({ action: "document.updated", actorUserId: ctx.actor.userId, entityType: "document", entityId: id, meta: ctx.meta });
}

/** Nova versão do arquivo: a ciência passa a valer para a nova versão e os interessados são avisados. */
export async function addDocumentVersion(ctx: Ctx, id: string, input: { file: Upload; changeNote?: string | null; notify?: boolean }) {
  requirePermission(ctx.actor, "document:manage");
  return getDb().transaction(async (tx) => {
    const d = await findDoc(id, tx);
    if (d.status === "archived") throw invalidTransition("Documento arquivado. Restaure-o para enviar nova versão.");
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${documentVersions.versionNumber}), 0)`.mapWith(Number) }).from(documentVersions).where(eq(documentVersions.documentId, id));
    const stored = await storeUpload(input.file, ctx.actor.userId, tx);
    const [ver] = await tx.insert(documentVersions).values({ documentId: id, versionNumber: max + 1, fileId: stored.id, changeNote: input.changeNote || null, createdByUserId: ctx.actor.userId }).returning();
    await tx.update(documents).set({ currentVersionId: ver.id, updatedAt: new Date() }).where(eq(documents.id, id));
    await audit({ action: "document.version_added", actorUserId: ctx.actor.userId, entityType: "document", entityId: id, metadata: { version: ver.versionNumber }, meta: ctx.meta }, tx);
    if (input.notify !== false) {
      const title = `Documento atualizado: ${d.title}`;
      if (d.scope === "personal" && d.ownerEmployeeId) {
        const [emp] = await tx.select({ userId: employees.userId }).from(employees).where(eq(employees.id, d.ownerEmployeeId));
        await notify([emp.userId], { category: "documentos", title, link: `/documentos/${id}`, entityType: "document", entityId: id }, tx);
      } else if (d.scope === "institutional") {
        await notifyEveryone(tx, { title, requiresAck: d.requiresAck, id });
      }
    }
    return { versionNumber: ver.versionNumber };
  });
}

export async function setDocumentArchived(ctx: Ctx, id: string, archived: boolean) {
  requirePermission(ctx.actor, "document:manage");
  await findDoc(id);
  await getDb().update(documents).set({ status: archived ? "archived" : "active", updatedAt: new Date() }).where(eq(documents.id, id));
  await audit({ action: archived ? "document.archived" : "document.updated", actorUserId: ctx.actor.userId, entityType: "document", entityId: id, metadata: archived ? undefined : { restored: true }, meta: ctx.meta });
}

/** Remove um documento enviado por engano (exclusão lógica; o registro fica para auditoria). Motivo obrigatório. */
export async function removeDocument(ctx: Ctx, id: string, reason: string) {
  requirePermission(ctx.actor, "document:manage");
  if (!reason.trim()) throw validation("Informe o motivo.", { reason: ["Informe o motivo da remoção."] });
  await findDoc(id);
  await getDb().update(documents).set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() }).where(eq(documents.id, id));
  await audit({ action: "document.removed", actorUserId: ctx.actor.userId, entityType: "document", entityId: id, metadata: { reason: reason.trim().slice(0, 200) }, meta: ctx.meta });
}

/** Download de qualquer versão pela gestão. Auditado como acesso do RH (não aparece no histórico do colaborador). */
export async function openDocumentVersionAdmin(ctx: Ctx, id: string, versionId: string) {
  requirePermission(ctx.actor, "document:read:any");
  const [row] = await getDb()
    .select({ asset: fileAssets, scope: documents.scope })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .innerJoin(fileAssets, eq(fileAssets.id, documentVersions.fileId))
    .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)));
  if (!row) throw notFound("Arquivo");
  await audit({ action: "document.downloaded", actorUserId: ctx.actor.userId, entityType: "document", entityId: id, metadata: { versionId, scope: row.scope, by: "rh" }, meta: ctx.meta });
  return row.asset;
}
