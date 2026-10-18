import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const tsz = (name: string) => timestamp(name, { withTimezone: true });

/** Regras de público-alvo reutilizadas por comunicados, cursos e oportunidades. */
export const audienceType = pgEnum("audience_type", ["all", "department", "unit", "job_position", "job_family"]);
export type AudienceType = (typeof audienceType.enumValues)[number];
