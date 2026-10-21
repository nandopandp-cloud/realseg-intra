import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { departments, employees, feedbacks, jobPositions, units } from "../../db/schema";
import { invalidTransition, notFound, validation } from "../../errors";
import { textSearch } from "../audience";
import { notify } from "../notifications";

export const FEEDBACK_TABS = ["publicados", "pendentes", "rascunhos", "arquivados"] as const;
export type FeedbackType = "feedback" | "avaliacao" | "reconhecimento";
export type FeedbackInput = { employeeId: string; type: FeedbackType; title: string; cycle: string | null; body: string; authorContext: string; showAuthor: boolean };

const author = alias(employees, "author");

/** Feedbacks registrados (todos os colaboradores). Exige `feedback:write:any`. */
export async function listFeedbacksAdmin(ctx: Ctx, opts: { tab?: (typeof FEEDBACK_TABS)[number]; q?: string; type?: FeedbackType } = {}) {
  requirePermission(ctx.actor, "feedback:write:any");
  const tab = opts.tab ?? "publicados";
  const base = and(opts.q ? or(textSearch([employees.fullName, feedbacks.title], opts.q), eq(employees.registrationNumber, opts.q.trim())) : undefined, opts.type ? eq(feedbacks.type, opts.type) : undefined);
  const where = and(
    base,
    tab === "publicados" ? eq(feedbacks.status, "publicado") : tab === "pendentes" ? and(eq(feedbacks.status, "publicado"), isNull(feedbacks.acknowledgedAt)) : tab === "rascunhos" ? eq(feedbacks.status, "rascunho") : eq(feedbacks.status, "arquivado"),
  );
  const db = getDb();
  const [items, [counts]] = await Promise.all([
    db
      .select({
        id: feedbacks.id,
        type: feedbacks.type,
        title: feedbacks.title,
        cycle: feedbacks.cycle,
        status: feedbacks.status,
        publishedAt: feedbacks.publishedAt,
        acknowledgedAt: feedbacks.acknowledgedAt,
        updatedAt: feedbacks.updatedAt,
        employee: { id: employees.id, name: employees.fullName, registration: employees.registrationNumber },
        authorName: author.fullName,
        authorContext: feedbacks.authorContext,
      })
      .from(feedbacks)
      .innerJoin(employees, eq(employees.id, feedbacks.employeeId))
      .leftJoin(author, eq(author.userId, feedbacks.authorUserId))
      .where(where)
      .orderBy(desc(sql`coalesce(${feedbacks.publishedAt}, ${feedbacks.updatedAt})`))
      .limit(200),
    db
      .select({
        publicados: sql<number>`count(*) FILTER (WHERE ${feedbacks.status} = 'publicado')`.mapWith(Number),
        pendentes: sql<number>`count(*) FILTER (WHERE ${feedbacks.status} = 'publicado' AND ${feedbacks.acknowledgedAt} IS NULL)`.mapWith(Number),
        rascunhos: sql<number>`count(*) FILTER (WHERE ${feedbacks.status} = 'rascunho')`.mapWith(Number),
        arquivados: sql<number>`count(*) FILTER (WHERE ${feedbacks.status} = 'arquivado')`.mapWith(Number),
      })
      .from(feedbacks)
      .innerJoin(employees, eq(employees.id, feedbacks.employeeId))
      .where(base),
  ]);
  return { items, counts };
}

export async function getFeedbackAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "feedback:write:any");
  const [row] = await getDb()
    .select({
      f: feedbacks,
      employee: { id: employees.id, name: employees.fullName, registration: employees.registrationNumber, position: jobPositions.title, department: departments.name, unit: units.name },
      authorName: author.fullName,
    })
    .from(feedbacks)
    .innerJoin(employees, eq(employees.id, feedbacks.employeeId))
    .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
    .innerJoin(departments, eq(departments.id, employees.departmentId))
    .innerJoin(units, eq(units.id, employees.unitId))
    .leftJoin(author, eq(author.userId, feedbacks.authorUserId))
    .where(eq(feedbacks.id, id));
  if (!row) throw notFound("Feedback");
  return { ...row.f, employee: row.employee, authorName: row.authorName };
}

async function assertEmployee(employeeId: string) {
  const [e] = await getDb().select({ id: employees.id, userId: employees.userId }).from(employees).where(and(eq(employees.id, employeeId), ne(employees.status, "desligado")));
  if (!e) throw validation("Colaborador inválido.", { employeeId: ["Escolha um colaborador ativo."] });
  return e;
}

const values = (i: FeedbackInput) => ({ employeeId: i.employeeId, type: i.type, title: i.title.trim(), cycle: i.cycle?.trim() || null, body: i.body.trim(), authorContext: i.authorContext.trim(), showAuthor: i.showAuthor });

/** Registra um feedback como rascunho ou já publicado (publicar avisa o colaborador, sem expor o conteúdo). */
export async function createFeedback(ctx: Ctx, input: FeedbackInput & { publish: boolean }) {
  requirePermission(ctx.actor, "feedback:write:any");
  const emp = await assertEmployee(input.employeeId);
  if (emp.userId === ctx.actor.userId) throw validation("Você não pode registrar um feedback para si mesmo.", { employeeId: ["Escolha outra pessoa."] });
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(feedbacks)
      .values({ ...values(input), authorUserId: ctx.actor.userId, status: input.publish ? "publicado" : "rascunho", publishedAt: input.publish ? new Date() : null })
      .returning({ id: feedbacks.id });
    await audit({ action: input.publish ? "feedback.published" : "feedback.saved", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: row.id, metadata: { employeeId: input.employeeId, type: input.type }, meta: ctx.meta }, tx);
    if (input.publish) await notify([emp.userId], { category: "feedbacks", title: "Você recebeu um novo registro em Avaliações", link: `/carreira/avaliacoes/${row.id}`, entityType: "feedback", entityId: row.id }, tx);
    return row;
  });
}

/**
 * Edita. Em publicado, a edição gera nova versão: a confirmação de leitura é reiniciada e o colaborador é avisado.
 */
export async function updateFeedback(ctx: Ctx, id: string, input: FeedbackInput) {
  requirePermission(ctx.actor, "feedback:write:any");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [f] = await tx.select().from(feedbacks).where(eq(feedbacks.id, id));
    if (!f) throw notFound("Feedback");
    if (f.status === "arquivado") throw invalidTransition("Feedback arquivado não pode ser editado.");
    if (input.employeeId !== f.employeeId && f.status !== "rascunho") throw invalidTransition("Não é possível trocar o colaborador de um feedback publicado.");
    const emp = await assertEmployee(input.employeeId);
    const published = f.status === "publicado";
    await tx
      .update(feedbacks)
      .set({ ...values(input), ...(published ? { acknowledgedAt: null, version: sql`${feedbacks.version} + 1` } : {}), updatedAt: new Date() })
      .where(eq(feedbacks.id, id));
    await audit({ action: "feedback.saved", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: id, metadata: { republished: published }, meta: ctx.meta }, tx);
    if (published) await notify([emp.userId], { category: "feedbacks", title: "Um registro em Avaliações foi atualizado", link: `/carreira/avaliacoes/${id}`, entityType: "feedback", entityId: id }, tx);
  });
}

export async function publishFeedback(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "feedback:write:any");
  return getDb().transaction(async (tx) => {
    const [f] = await tx.select().from(feedbacks).where(eq(feedbacks.id, id));
    if (!f) throw notFound("Feedback");
    if (f.status !== "rascunho") throw invalidTransition("Somente rascunhos podem ser publicados.");
    await tx.update(feedbacks).set({ status: "publicado", publishedAt: new Date(), updatedAt: new Date() }).where(eq(feedbacks.id, id));
    const [e] = await tx.select({ userId: employees.userId }).from(employees).where(eq(employees.id, f.employeeId));
    await notify([e.userId], { category: "feedbacks", title: "Você recebeu um novo registro em Avaliações", link: `/carreira/avaliacoes/${id}`, entityType: "feedback", entityId: id }, tx);
    await audit({ action: "feedback.published", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: id, meta: ctx.meta }, tx);
  });
}

/** Arquivar tira da visão do colaborador; rascunho pode ser excluído. */
export async function archiveFeedback(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "feedback:write:any");
  const db = getDb();
  const [f] = await db.select().from(feedbacks).where(eq(feedbacks.id, id));
  if (!f) throw notFound("Feedback");
  if (f.status === "rascunho") {
    await db.delete(feedbacks).where(eq(feedbacks.id, id));
    await audit({ action: "feedback.archived", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: id, metadata: { deletedDraft: true }, meta: ctx.meta });
    return { deleted: true };
  }
  await db.update(feedbacks).set({ status: "arquivado", updatedAt: new Date() }).where(eq(feedbacks.id, id));
  await audit({ action: "feedback.archived", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: id, meta: ctx.meta });
  return { deleted: false };
}
