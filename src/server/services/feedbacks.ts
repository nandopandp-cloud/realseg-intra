import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { audit } from "../audit";
import { requireEmployee, requirePermission, type Ctx } from "../auth/actor";
import { ref } from "./audience";
import { getDb } from "../db/client";
import { employees, feedbacks } from "../db/schema";
import { notFound } from "../errors";

export const FEEDBACK_TYPE_LABEL = { feedback: "Feedback", avaliacao: "Avaliação", reconhecimento: "Reconhecimento" } as const;

/** Somente feedbacks PUBLICADOS do próprio colaborador. Rascunhos e de terceiros nunca aparecem. */
function own(ctx: Ctx) {
  const e = requireEmployee(ctx.actor);
  return and(eq(feedbacks.employeeId, e.id), eq(feedbacks.status, "publicado"));
}

const fields = {
  id: feedbacks.id,
  type: feedbacks.type,
  title: feedbacks.title,
  cycle: feedbacks.cycle,
  publishedAt: feedbacks.publishedAt,
  acknowledgedAt: feedbacks.acknowledgedAt,
  authorLabel: sql<string>`CASE WHEN ${ref(feedbacks.showAuthor)} THEN coalesce((SELECT ${ref(employees.fullName)} FROM ${employees} WHERE ${ref(employees.userId)} = ${ref(feedbacks.authorUserId)}), ${ref(feedbacks.authorContext)}) ELSE ${ref(feedbacks.authorContext)} END`,
  authorContext: feedbacks.authorContext,
};

export async function listMyFeedbacks(ctx: Ctx) {
  requirePermission(ctx.actor, "feedback:read:own");
  return getDb().select(fields).from(feedbacks).where(own(ctx)).orderBy(desc(feedbacks.publishedAt));
}

export async function pendingFeedbackAcks(ctx: Ctx) {
  requirePermission(ctx.actor, "feedback:read:own");
  const rows = await getDb().select({ id: feedbacks.id }).from(feedbacks).where(and(own(ctx), isNull(feedbacks.acknowledgedAt)));
  return rows.length;
}

export async function getMyFeedback(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "feedback:read:own");
  const [row] = await getDb()
    .select({ ...fields, body: feedbacks.body })
    .from(feedbacks)
    .where(and(eq(feedbacks.id, id), own(ctx)));
  if (!row) throw notFound("Feedback");
  await audit({ action: "feedback.viewed", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: id, meta: ctx.meta });
  return row;
}

/** Confirma leitura (não concordância). Idempotente. */
export async function acknowledgeFeedback(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "feedback:acknowledge:own");
  const [row] = await getDb()
    .update(feedbacks)
    .set({ acknowledgedAt: sql`coalesce(${feedbacks.acknowledgedAt}, now())` })
    .where(and(eq(feedbacks.id, id), own(ctx)))
    .returning({ id: feedbacks.id, acknowledgedAt: feedbacks.acknowledgedAt });
  if (!row) throw notFound("Feedback");
  await audit({ action: "feedback.acknowledged", actorUserId: ctx.actor.userId, entityType: "feedback", entityId: id, meta: ctx.meta });
  return row;
}
