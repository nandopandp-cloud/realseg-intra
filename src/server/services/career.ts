import { and, asc, desc, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { audit } from "../audit";
import { requireEmployee, requirePermission, type Ctx } from "../auth/actor";
import { getDb } from "../db/client";
import {
  achievements,
  courses,
  developmentGoals,
  enrollments,
  internalOpportunities,
  jobFamilies,
  jobPositions,
  learningPaths,
  opportunityApplications,
  opportunityEligibility,
  salaryBands,
  units,
} from "../db/schema";
import { conflict, invalidTransition, notFound } from "../errors";
import { audienceMatch, ref } from "./audience";
import { listCourses, listLearningPaths, trainingHistory } from "./courses";

const NEW_DAYS = 7;

/** Oportunidade visível: publicada, dentro do prazo e elegível (sem regras = todos). */
function visibleOpportunity(ctx: Ctx): SQL {
  return and(
    eq(internalOpportunities.status, "published"),
    lte(internalOpportunities.publishedAt, sql`now()`),
    or(isNull(internalOpportunities.closesAt), gt(internalOpportunities.closesAt, sql`now()`)),
    audienceMatch(opportunityEligibility, opportunityEligibility.opportunityId, internalOpportunities.id, ctx.actor, { emptyMeansAll: true }),
  )!;
}

const oppFields = (employeeId: string) => ({
  id: internalOpportunities.id,
  title: internalOpportunities.title,
  areaLabel: internalOpportunities.areaLabel,
  description: internalOpportunities.description,
  requirements: internalOpportunities.requirements,
  isHighlighted: internalOpportunities.isHighlighted,
  publishedAt: internalOpportunities.publishedAt,
  closesAt: internalOpportunities.closesAt,
  location: sql<string | null>`(SELECT ${ref(units.city)} || ' - ' || ${ref(units.state)} FROM ${units} WHERE ${ref(units.id)} = ${ref(internalOpportunities.unitId)})`,
  isNew: sql<boolean>`${internalOpportunities.publishedAt} > now() - make_interval(days => ${NEW_DAYS})`,
  applicationStatus: sql<string | null>`(SELECT a.status FROM ${opportunityApplications} a WHERE a.opportunity_id = ${ref(internalOpportunities.id)} AND a.employee_id = ${employeeId})`,
});

export async function listOpportunities(ctx: Ctx, limit = 50) {
  requirePermission(ctx.actor, "opportunity:read");
  const e = requireEmployee(ctx.actor);
  return getDb()
    .select(oppFields(e.id))
    .from(internalOpportunities)
    .where(visibleOpportunity(ctx))
    .orderBy(desc(internalOpportunities.isHighlighted), desc(internalOpportunities.publishedAt))
    .limit(limit);
}

export async function getOpportunity(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "opportunity:read");
  const e = requireEmployee(ctx.actor);
  const [row] = await getDb()
    .select(oppFields(e.id))
    .from(internalOpportunities)
    .where(and(eq(internalOpportunities.id, id), visibleOpportunity(ctx)));
  if (!row) throw notFound("Oportunidade");
  return row;
}

export async function applyToOpportunity(ctx: Ctx, id: string, message?: string) {
  requirePermission(ctx.actor, "opportunity:apply");
  const e = requireEmployee(ctx.actor);
  const opp = await getOpportunity(ctx, id);
  const db = getDb();
  if (opp.applicationStatus && opp.applicationStatus !== "retirada") throw conflict("Você já se candidatou a esta oportunidade.");
  await db
    .insert(opportunityApplications)
    .values({ opportunityId: id, employeeId: e.id, message: message || null })
    .onConflictDoUpdate({
      target: [opportunityApplications.opportunityId, opportunityApplications.employeeId],
      set: { status: "enviada", message: message || null, withdrawnAt: null, updatedAt: new Date() },
      setWhere: eq(opportunityApplications.status, "retirada"),
    });
  await audit({ action: "opportunity.applied", actorUserId: ctx.actor.userId, entityType: "opportunity", entityId: id, meta: ctx.meta });
  return getOpportunity(ctx, id);
}

export async function withdrawApplication(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "opportunity:apply");
  const e = requireEmployee(ctx.actor);
  const rows = await getDb()
    .update(opportunityApplications)
    .set({ status: "retirada", withdrawnAt: new Date(), updatedAt: new Date() })
    .where(and(eq(opportunityApplications.opportunityId, id), eq(opportunityApplications.employeeId, e.id), eq(opportunityApplications.status, "enviada")))
    .returning();
  if (!rows.length) throw invalidTransition("Não há candidatura ativa que possa ser retirada.");
  await audit({ action: "opportunity.withdrawn", actorUserId: ctx.actor.userId, entityType: "opportunity", entityId: id, meta: ctx.meta });
}

/**
 * Plano de cargos da família do colaborador. Somente faixas publicadas e vigentes.
 * Não há salário individual no sistema; nada é inferido sobre promoção/elegibilidade.
 */
export async function careerPlan(ctx: Ctx) {
  requirePermission(ctx.actor, "career:read");
  const e = requireEmployee(ctx.actor);
  const db = getDb();
  const [family] = await db.select().from(jobFamilies).where(eq(jobFamilies.id, e.jobFamilyId));
  const positions = await db
    .select({
      id: jobPositions.id,
      title: jobPositions.title,
      level: jobPositions.level,
      levelLabel: jobPositions.levelLabel,
      description: jobPositions.description,
      requirements: jobPositions.requirements,
      progressionCriteria: jobPositions.progressionCriteria,
      band: sql<{ minCents: number; maxCents: number; effectiveFrom: string } | null>`(
        SELECT json_build_object('minCents', b.min_cents, 'maxCents', b.max_cents, 'effectiveFrom', b.effective_from)
        FROM ${salaryBands} b
        WHERE b.job_position_id = ${jobPositions.id}
          AND b.visible_to_employees = true
          AND b.effective_from <= current_date
          AND (b.effective_until IS NULL OR b.effective_until >= current_date)
        ORDER BY b.effective_from DESC LIMIT 1)`,
    })
    .from(jobPositions)
    .where(and(eq(jobPositions.familyId, e.jobFamilyId), eq(jobPositions.active, true)))
    .orderBy(asc(jobPositions.level), asc(jobPositions.title));
  return { family, positions: positions.map((p) => ({ ...p, isCurrent: p.id === e.jobPositionId })) };
}

export async function myGoals(ctx: Ctx) {
  requirePermission(ctx.actor, "career:read");
  const e = requireEmployee(ctx.actor);
  return getDb()
    .select({
      id: developmentGoals.id,
      title: developmentGoals.title,
      description: developmentGoals.description,
      dueDate: developmentGoals.dueDate,
      startsOn: developmentGoals.startsOn,
      status: developmentGoals.status,
      completedAt: developmentGoals.completedAt,
      courseSlug: courses.slug,
      courseCompleted: sql<boolean>`EXISTS (SELECT 1 FROM ${enrollments} en WHERE en.course_id = ${ref(developmentGoals.courseId)} AND en.user_id = ${ctx.actor.userId} AND en.status = 'concluido')`,
    })
    .from(developmentGoals)
    .leftJoin(courses, eq(courses.id, developmentGoals.courseId))
    .where(eq(developmentGoals.employeeId, e.id))
    .orderBy(asc(developmentGoals.position));
}

export async function myAchievements(ctx: Ctx, limit = 10) {
  requirePermission(ctx.actor, "career:read");
  const e = requireEmployee(ctx.actor);
  return getDb().select().from(achievements).where(eq(achievements.employeeId, e.id)).orderBy(desc(achievements.awardedAt)).limit(limit);
}

/** Trilha da família profissional do colaborador ("Meu desenvolvimento"). */
export async function myTrack(ctx: Ctx) {
  const e = requireEmployee(ctx.actor);
  const paths = await listLearningPaths(ctx);
  const [familyPath] = await getDb().select({ id: learningPaths.id }).from(learningPaths).where(eq(learningPaths.jobFamilyId, e.jobFamilyId)).limit(1);
  return paths.find((p) => p.id === familyPath?.id) ?? null;
}

export async function recommendedContent(ctx: Ctx, limit = 3) {
  const all = await listCourses(ctx, { filter: "nao-iniciados" });
  const preferred = ["lideranca", "desenvolvimento-pessoal", "seguranca"];
  return all.sort((a, b) => preferred.indexOf(a.category.slug) - preferred.indexOf(b.category.slug)).filter((c) => preferred.includes(c.category.slug)).slice(0, limit);
}

export async function careerOverview(ctx: Ctx) {
  requirePermission(ctx.actor, "career:read");
  const [track, goals, opportunities, recommended, achievementsList, plan, history] = await Promise.all([
    myTrack(ctx),
    myGoals(ctx),
    listOpportunities(ctx, 2),
    recommendedContent(ctx),
    myAchievements(ctx, 3),
    careerPlan(ctx),
    trainingHistory(ctx),
  ]);
  const current = plan.positions.find((p) => p.isCurrent) ?? null;
  return { track, goals, opportunities, recommended, achievements: achievementsList, currentPosition: current, family: plan.family, history };
}

