import { boolean, date, index, integer, pgEnum, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./identity";

export const departments = pgTable("departments", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => departments.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const units = pgTable("units", {
  id: id(),
  name: text("name").notNull().unique(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Família profissional (ex.: Operacional, Segurança, Administrativo). */
export const jobFamilies = pgTable("job_families", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: createdAt(),
});

export const jobPositions = pgTable(
  "job_positions",
  {
    id: id(),
    title: text("title").notNull(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => jobFamilies.id, { onDelete: "restrict" }),
    /** Ordem do nível dentro da família (1 = inicial). */
    level: integer("level").notNull(),
    levelLabel: text("level_label").notNull(),
    description: text("description"),
    requirements: text("requirements"),
    progressionCriteria: text("progression_criteria"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("job_positions_family_idx").on(t.familyId, t.level)],
);

export const employeeStatus = pgEnum("employee_status", ["ativo", "afastado", "desligado"]);

export const employees = pgTable(
  "employees",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    preferredName: text("preferred_name"),
    registrationNumber: text("registration_number").notNull().unique(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    jobPositionId: uuid("job_position_id")
      .notNull()
      .references(() => jobPositions.id, { onDelete: "restrict" }),
    managerEmployeeId: uuid("manager_employee_id").references((): AnyPgColumn => employees.id, { onDelete: "set null" }),
    admissionDate: date("admission_date", { mode: "string" }).notNull(),
    status: employeeStatus("status").notNull().default("ativo"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("employees_department_idx").on(t.departmentId),
    index("employees_unit_idx").on(t.unitId),
    index("employees_manager_idx").on(t.managerEmployeeId),
  ],
);
