import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb, type Executor } from "../../db/client";
import {
  courses,
  departments,
  developmentGoals,
  employees,
  internalOpportunities,
  jobFamilies,
  jobPositions,
  opportunityApplications,
  opportunityEligibility,
  salaryBands,
  units,
} from "../../db/schema";
import { invalidTransition, notFound, validation } from "../../errors";
import { ref, textSearch } from "../audience";
import { notify } from "../notifications";
import { assertAudienceRefs, audienceUserIds, describeAudience, fromRules, toRules, type AudienceInput } from "./audience";

// ── Oportunidades internas ───────────────────────────────────────────────────

export const OPPORTUNITY_TABS = ["abertas", "rascunhos", "encerradas"] as const;

const appCount = (statuses: string[]) =>
  sql<number>`(SELECT count(*)::int FROM ${opportunityApplications} a WHERE a.opportunity_id = ${ref(internalOpportunities.id)} AND a.status IN (${sql.join(statuses.map((s) => sql`${s}`), sql`, `)}))`.mapWith(Number);

/** Encerrada = status "closed" ou prazo vencido. */
const isOpen = sql`(${internalOpportunities.status} = 'published' AND (${internalOpportunities.closesAt} IS NULL OR ${internalOpportunities.closesAt} > now()))`;

export async function listOpportunitiesAdmin(ctx: Ctx, opts: { tab?: (typeof OPPORTUNITY_TABS)[number]; q?: string } = {}) {
  requirePermission(ctx.actor, "career:manage");
  const tab = opts.tab ?? "abertas";
  const where = and(
    textSearch([internalOpportunities.title, internalOpportunities.areaLabel], opts.q),
    tab === "abertas" ? isOpen : tab === "rascunhos" ? eq(internalOpportunities.status, "draft") : sql`(${internalOpportunities.status} = 'closed' OR (${internalOpportunities.status} = 'published' AND ${internalOpportunities.closesAt} <= now()))`,
  );
  const db = getDb();
  const [items, [counts]] = await Promise.all([
    db
      .select({
        id: internalOpportunities.id,
        title: internalOpportunities.title,
        areaLabel: internalOpportunities.areaLabel,
        status: internalOpportunities.status,
        isHighlighted: internalOpportunities.isHighlighted,
        publishedAt: internalOpportunities.publishedAt,
        closesAt: internalOpportunities.closesAt,
        unit: units.name,
        position: jobPositions.title,
        pending: appCount(["enviada", "em_analise"]),
        total: appCount(["enviada", "em_analise", "encerrada"]),
      })
      .from(internalOpportunities)
      .leftJoin(units, eq(units.id, internalOpportunities.unitId))
      .leftJoin(jobPositions, eq(jobPositions.id, internalOpportunities.jobPositionId))
      .where(where)
      .orderBy(desc(sql`coalesce(${internalOpportunities.publishedAt}, ${internalOpportunities.createdAt})`)),
    db
      .select({
        abertas: sql<number>`count(*) FILTER (WHERE ${isOpen})`.mapWith(Number),
        rascunhos: sql<number>`count(*) FILTER (WHERE ${internalOpportunities.status} = 'draft')`.mapWith(Number),
        encerradas: sql<number>`count(*) FILTER (WHERE ${internalOpportunities.status} = 'closed' OR (${internalOpportunities.status} = 'published' AND ${internalOpportunities.closesAt} <= now()))`.mapWith(Number),
      })
      .from(internalOpportunities),
  ]);
  return { items, counts };
}

export type OpportunityInput = {
  title: string;
  areaLabel: string;
  description: string;
  requirements: string;
  jobPositionId: string | null;
  departmentId: string | null;
  unitId: string | null;
  isHighlighted: boolean;
  closesAt: string | null;
  eligibility: AudienceInput;
};

async function findOpp(id: string, db: Executor = getDb()) {
  const [o] = await db.select().from(internalOpportunities).where(eq(internalOpportunities.id, id));
  if (!o) throw notFound("Oportunidade");
  return o;
}

export async function getOpportunityAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "career:manage");
  const db = getDb();
  const o = await findOpp(id);
  const [rules, applications] = await Promise.all([
    db.select({ type: opportunityEligibility.type, refId: opportunityEligibility.refId }).from(opportunityEligibility).where(eq(opportunityEligibility.opportunityId, id)),
    db
      .select({
        id: opportunityApplications.id,
        status: opportunityApplications.status,
        message: opportunityApplications.message,
        createdAt: opportunityApplications.createdAt,
        updatedAt: opportunityApplications.updatedAt,
        employee: { id: employees.id, name: employees.fullName, registration: employees.registrationNumber, position: jobPositions.title, unit: units.name, admissionDate: employees.admissionDate },
      })
      .from(opportunityApplications)
      .innerJoin(employees, eq(employees.id, opportunityApplications.employeeId))
      .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
      .innerJoin(units, eq(units.id, employees.unitId))
      .where(eq(opportunityApplications.opportunityId, id))
      .orderBy(sql`CASE ${opportunityApplications.status} WHEN 'enviada' THEN 0 WHEN 'em_analise' THEN 1 WHEN 'encerrada' THEN 2 ELSE 3 END`, asc(opportunityApplications.createdAt)),
  ]);
  // Sem regras = todos os colaboradores (regra das oportunidades).
  const eligibility = rules.length ? fromRules(rules) : { all: true, department: [], unit: [], job_position: [], job_family: [] };
  return { ...o, eligibility, eligibilityLabels: await describeAudience(db, eligibility), applications, open: o.status === "published" && (!o.closesAt || o.closesAt > new Date()) };
}

async function assertOppRefs(db: Executor, input: OpportunityInput) {
  if (input.jobPositionId && !(await db.select({ id: jobPositions.id }).from(jobPositions).where(eq(jobPositions.id, input.jobPositionId))).length) throw validation("Cargo inválido.", { jobPositionId: ["Escolha um cargo da lista."] });
  if (input.departmentId && !(await db.select({ id: departments.id }).from(departments).where(eq(departments.id, input.departmentId))).length) throw validation("Área inválida.", { departmentId: ["Escolha uma área da lista."] });
  if (input.unitId && !(await db.select({ id: units.id }).from(units).where(eq(units.id, input.unitId))).length) throw validation("Unidade inválida.", { unitId: ["Escolha uma unidade da lista."] });
  await assertAudienceRefs(db, input.eligibility);
}

const oppValues = (i: OpportunityInput) => ({
  title: i.title.trim(),
  areaLabel: i.areaLabel.trim(),
  description: i.description.trim(),
  requirements: i.requirements.trim(),
  jobPositionId: i.jobPositionId || null,
  departmentId: i.departmentId || null,
  unitId: i.unitId || null,
  isHighlighted: i.isHighlighted,
  closesAt: i.closesAt ? new Date(i.closesAt) : null,
});

async function replaceEligibility(tx: Executor, id: string, a: AudienceInput) {
  await tx.delete(opportunityEligibility).where(eq(opportunityEligibility.opportunityId, id));
  if (!a.all) await tx.insert(opportunityEligibility).values(toRules(a).map((r) => ({ opportunityId: id, ...r })));
}

export async function saveOpportunity(ctx: Ctx, id: string | null, input: OpportunityInput) {
  requirePermission(ctx.actor, "career:manage");
  return getDb().transaction(async (tx) => {
    await assertOppRefs(tx, input);
    const [row] = id
      ? await tx.update(internalOpportunities).set({ ...oppValues(input), updatedAt: new Date() }).where(eq(internalOpportunities.id, id)).returning({ id: internalOpportunities.id })
      : await tx.insert(internalOpportunities).values({ ...oppValues(input), status: "draft", createdByUserId: ctx.actor.userId }).returning({ id: internalOpportunities.id });
    if (!row) throw notFound("Oportunidade");
    await replaceEligibility(tx, row.id, input.eligibility);
    await audit({ action: "opportunity.saved", actorUserId: ctx.actor.userId, entityType: "opportunity", entityId: row.id, meta: ctx.meta }, tx);
    return row;
  });
}

/** Publicar (avisa os elegíveis, opcional), encerrar ou reabrir como rascunho. */
export async function setOpportunityStatus(ctx: Ctx, id: string, status: "draft" | "published" | "closed", opts: { notify?: boolean } = {}) {
  requirePermission(ctx.actor, "career:manage");
  return getDb().transaction(async (tx) => {
    const o = await findOpp(id, tx);
    if (status === "published" && o.closesAt && o.closesAt <= new Date()) throw invalidTransition("O prazo de inscrição já passou. Ajuste a data antes de publicar.");
    await tx
      .update(internalOpportunities)
      .set({ status, publishedAt: status === "published" ? (o.publishedAt ?? new Date()) : o.publishedAt, updatedAt: new Date() })
      .where(eq(internalOpportunities.id, id));
    if (status === "published" && o.status !== "published" && opts.notify) {
      const users = await audienceUserIds(tx, "opportunity_eligibility", "opportunity_id", id, { emptyMeansAll: true });
      await notify(users, { category: "carreira", title: `Nova oportunidade interna: ${o.title}`, link: `/carreira/oportunidades/${id}`, entityType: "opportunity", entityId: id }, tx);
    }
    if (status === "closed") {
      // Candidaturas em aberto são encerradas e os candidatos avisados.
      const open = await tx
        .update(opportunityApplications)
        .set({ status: "encerrada", updatedAt: new Date() })
        .where(and(eq(opportunityApplications.opportunityId, id), sql`${opportunityApplications.status} IN ('enviada','em_analise')`))
        .returning({ employeeId: opportunityApplications.employeeId });
      if (open.length) {
        const r = await tx.execute<{ user_id: string }>(sql`SELECT user_id FROM employees WHERE id IN (${sql.join(open.map((x) => sql`${x.employeeId}`), sql`, `)})`);
        await notify(r.rows.map((x) => x.user_id), { category: "carreira", title: `Processo encerrado: ${o.title}`, body: "Obrigado pela participação. O RH entrará em contato se houver próximos passos.", link: `/carreira/oportunidades`, entityType: "opportunity", entityId: id }, tx);
      }
    }
    await audit({ action: "opportunity.status_changed", actorUserId: ctx.actor.userId, entityType: "opportunity", entityId: id, metadata: { from: o.status, to: status }, meta: ctx.meta }, tx);
  });
}

/** Candidatura: em análise ou encerrada. Retiradas pelo colaborador não mudam. Avisa o candidato. */
export async function setApplicationStatus(ctx: Ctx, applicationId: string, status: "em_analise" | "encerrada") {
  requirePermission(ctx.actor, "career:manage");
  return getDb().transaction(async (tx) => {
    const [a] = await tx
      .select({ app: opportunityApplications, title: internalOpportunities.title, userId: employees.userId })
      .from(opportunityApplications)
      .innerJoin(internalOpportunities, eq(internalOpportunities.id, opportunityApplications.opportunityId))
      .innerJoin(employees, eq(employees.id, opportunityApplications.employeeId))
      .where(eq(opportunityApplications.id, applicationId));
    if (!a) throw notFound("Candidatura");
    if (a.app.status === "retirada") throw invalidTransition("O colaborador retirou esta candidatura.");
    if (a.app.status === status) return;
    await tx.update(opportunityApplications).set({ status, updatedAt: new Date() }).where(eq(opportunityApplications.id, applicationId));
    await notify([a.userId], { category: "carreira", title: status === "em_analise" ? `Sua candidatura está em análise: ${a.title}` : `Candidatura encerrada: ${a.title}`, link: "/carreira/oportunidades", entityType: "opportunity", entityId: a.app.opportunityId }, tx);
    await audit({ action: "application.status_changed", actorUserId: ctx.actor.userId, entityType: "opportunity_application", entityId: applicationId, metadata: { from: a.app.status, to: status }, meta: ctx.meta }, tx);
  });
}

// ── Faixas salariais (plano de cargos) ───────────────────────────────────────

export async function listBandsAdmin(ctx: Ctx) {
  requirePermission(ctx.actor, "salary_band:read:any");
  const db = getDb();
  const [positions, bands] = await Promise.all([
    db
      .select({ id: jobPositions.id, title: jobPositions.title, level: jobPositions.level, levelLabel: jobPositions.levelLabel, familyId: jobFamilies.id, familyName: jobFamilies.name, active: jobPositions.active })
      .from(jobPositions)
      .innerJoin(jobFamilies, eq(jobFamilies.id, jobPositions.familyId))
      .orderBy(asc(jobFamilies.name), asc(jobPositions.level)),
    db.select().from(salaryBands).orderBy(desc(salaryBands.effectiveFrom)),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return positions.map((p) => {
    const own = bands.filter((b) => b.jobPositionId === p.id);
    const current = own.find((b) => b.effectiveFrom <= today && (!b.effectiveUntil || b.effectiveUntil >= today)) ?? null;
    return { ...p, bands: own, current };
  });
}

export type BandInput = { jobPositionId: string; minCents: number; maxCents: number; effectiveFrom: string; effectiveUntil: string | null; visibleToEmployees: boolean };

export async function saveBand(ctx: Ctx, id: string | null, input: BandInput) {
  requirePermission(ctx.actor, "career:manage");
  if (input.maxCents < input.minCents) throw validation("O máximo deve ser maior ou igual ao mínimo.", { maxCents: ["O máximo deve ser maior ou igual ao mínimo."] });
  if (input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) throw validation("O fim da vigência deve ser depois do início.", { effectiveUntil: ["Ajuste as datas."] });
  const db = getDb();
  if (!(await db.select({ id: jobPositions.id }).from(jobPositions).where(eq(jobPositions.id, input.jobPositionId))).length) throw validation("Cargo inválido.");
  const values = { jobPositionId: input.jobPositionId, minCents: input.minCents, maxCents: input.maxCents, effectiveFrom: input.effectiveFrom, effectiveUntil: input.effectiveUntil || null, visibleToEmployees: input.visibleToEmployees };
  const [row] = id ? await db.update(salaryBands).set(values).where(eq(salaryBands.id, id)).returning({ id: salaryBands.id }) : await db.insert(salaryBands).values(values).returning({ id: salaryBands.id });
  if (!row) throw notFound("Faixa");
  await audit({ action: "salary_band.saved", actorUserId: ctx.actor.userId, entityType: "salary_band", entityId: row.id, metadata: { jobPositionId: input.jobPositionId, visible: input.visibleToEmployees }, meta: ctx.meta });
  return row;
}

export async function deleteBand(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "career:manage");
  const rows = await getDb().delete(salaryBands).where(eq(salaryBands.id, id)).returning({ id: salaryBands.id });
  if (!rows.length) throw notFound("Faixa");
  await audit({ action: "salary_band.deleted", actorUserId: ctx.actor.userId, entityType: "salary_band", entityId: id, meta: ctx.meta });
}

// ── Plano de desenvolvimento (metas individuais) ─────────────────────────────

export async function listGoals(ctx: Ctx, employeeId: string) {
  requirePermission(ctx.actor, "career:manage");
  return getDb()
    .select({
      id: developmentGoals.id,
      title: developmentGoals.title,
      description: developmentGoals.description,
      dueDate: developmentGoals.dueDate,
      startsOn: developmentGoals.startsOn,
      status: developmentGoals.status,
      courseId: developmentGoals.courseId,
      courseTitle: courses.title,
      position: developmentGoals.position,
      completedAt: developmentGoals.completedAt,
    })
    .from(developmentGoals)
    .leftJoin(courses, eq(courses.id, developmentGoals.courseId))
    .where(eq(developmentGoals.employeeId, employeeId))
    .orderBy(asc(developmentGoals.position), asc(developmentGoals.createdAt));
}

export type GoalInput = { title: string; description: string | null; startsOn: string | null; dueDate: string | null; courseId: string | null; status: "pendente" | "em_andamento" | "concluida" };

export async function saveGoal(ctx: Ctx, employeeId: string, id: string | null, input: GoalInput) {
  requirePermission(ctx.actor, "career:manage");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [emp] = await tx.select({ id: employees.id, userId: employees.userId }).from(employees).where(and(eq(employees.id, employeeId), ne(employees.status, "desligado")));
    if (!emp) throw notFound("Colaborador");
    if (input.courseId && !(await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, input.courseId))).length) throw validation("Curso inválido.", { courseId: ["Escolha um curso da lista."] });
    const values = {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      startsOn: input.startsOn || null,
      dueDate: input.dueDate || null,
      courseId: input.courseId || null,
      status: input.status,
      completedAt: input.status === "concluida" ? new Date() : null,
    };
    let row: { id: string } | undefined;
    if (id) {
      [row] = await tx.update(developmentGoals).set({ ...values, updatedAt: new Date() }).where(and(eq(developmentGoals.id, id), eq(developmentGoals.employeeId, employeeId))).returning({ id: developmentGoals.id });
      if (!row) throw notFound("Meta");
    } else {
      const [{ n }] = await tx.select({ n: count() }).from(developmentGoals).where(eq(developmentGoals.employeeId, employeeId));
      [row] = await tx.insert(developmentGoals).values({ ...values, employeeId, position: n + 1, createdByUserId: ctx.actor.userId }).returning({ id: developmentGoals.id });
      await notify([emp.userId], { category: "carreira", title: "Nova etapa no seu plano de desenvolvimento", body: values.title, link: "/carreira/desenvolvimento", entityType: "development_goal", entityId: row.id }, tx);
    }
    await audit({ action: "goal.saved", actorUserId: ctx.actor.userId, entityType: "development_goal", entityId: row.id, metadata: { employeeId }, meta: ctx.meta }, tx);
    return row;
  });
}

export async function deleteGoal(ctx: Ctx, employeeId: string, id: string) {
  requirePermission(ctx.actor, "career:manage");
  const rows = await getDb().delete(developmentGoals).where(and(eq(developmentGoals.id, id), eq(developmentGoals.employeeId, employeeId))).returning({ id: developmentGoals.id });
  if (!rows.length) throw notFound("Meta");
  await audit({ action: "goal.deleted", actorUserId: ctx.actor.userId, entityType: "development_goal", entityId: id, metadata: { employeeId }, meta: ctx.meta });
}
