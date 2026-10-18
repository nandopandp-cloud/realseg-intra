import { boolean, date, index, integer, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { audienceType, createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";
import { departments, employees, jobPositions, units } from "./org";
import { courses } from "./learning";

/**
 * Faixa salarial de um cargo. Não há salário individual no sistema (minimização — LGPD).
 * Colaboradores só veem faixas com `visibleToEmployees = true` e vigentes.
 */
export const salaryBands = pgTable(
  "salary_bands",
  {
    id: id(),
    jobPositionId: uuid("job_position_id")
      .notNull()
      .references(() => jobPositions.id, { onDelete: "cascade" }),
    minCents: integer("min_cents").notNull(),
    maxCents: integer("max_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveUntil: date("effective_until", { mode: "string" }),
    visibleToEmployees: boolean("visible_to_employees").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("salary_bands_position_idx").on(t.jobPositionId, t.effectiveFrom)],
);

export const goalStatus = pgEnum("development_goal_status", ["pendente", "em_andamento", "concluida"]);

/** Próximas etapas do plano de desenvolvimento individual (definidas pelo RH/gestor). */
export const developmentGoals = pgTable(
  "development_goals",
  {
    id: id(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: date("due_date", { mode: "string" }),
    startsOn: date("starts_on", { mode: "string" }),
    status: goalStatus("status").notNull().default("pendente"),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: tsz("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("development_goals_employee_idx").on(t.employeeId, t.position)],
);

export const achievementKind = pgEnum("achievement_kind", ["auto", "manual"]);

export const achievements = pgTable(
  "achievements",
  {
    id: id(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    kind: achievementKind("kind").notNull(),
    /** Identificador estável para conquistas automáticas (garante idempotência). */
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    awardedAt: tsz("awarded_at").notNull().defaultNow(),
  },
  (t) => [unique("achievements_code_uq").on(t.employeeId, t.code)],
);

export const opportunityStatus = pgEnum("opportunity_status", ["draft", "published", "closed"]);

export const internalOpportunities = pgTable(
  "internal_opportunities",
  {
    id: id(),
    title: text("title").notNull(),
    jobPositionId: uuid("job_position_id").references(() => jobPositions.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    areaLabel: text("area_label").notNull(),
    description: text("description").notNull(),
    requirements: text("requirements").notNull(),
    status: opportunityStatus("status").notNull().default("draft"),
    isHighlighted: boolean("is_highlighted").notNull().default(false),
    publishedAt: tsz("published_at"),
    closesAt: tsz("closes_at"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("internal_opportunities_status_idx").on(t.status, t.publishedAt)],
);

/** Regras de elegibilidade. Sem linhas = elegível para todos os colaboradores ativos. */
export const opportunityEligibility = pgTable(
  "opportunity_eligibility",
  {
    id: id(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => internalOpportunities.id, { onDelete: "cascade" }),
    type: audienceType("type").notNull(),
    refId: uuid("ref_id"),
  },
  (t) => [index("opportunity_eligibility_opp_idx").on(t.opportunityId)],
);

export const applicationStatus = pgEnum("application_status", ["enviada", "em_analise", "encerrada", "retirada"]);

export const opportunityApplications = pgTable(
  "opportunity_applications",
  {
    id: id(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => internalOpportunities.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    status: applicationStatus("status").notNull().default("enviada"),
    message: text("message"),
    withdrawnAt: tsz("withdrawn_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("opportunity_applications_uq").on(t.opportunityId, t.employeeId)],
);
