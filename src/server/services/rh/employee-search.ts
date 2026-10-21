import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import { can, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { departments, employees, jobPositions, units } from "../../db/schema";
import { forbidden } from "../../errors";
import { textSearch } from "../audience";

/**
 * Busca rápida de colaboradores para seletores (distribuir documento, registrar feedback, atribuir meta).
 * Desligados não aparecem. Exige alguma permissão que trabalhe com colaboradores.
 */
export async function searchEmployees(ctx: Ctx, q: string, limit = 8) {
  const a = ctx.actor;
  if (!can(a, "employee:read:any") && !can(a, "document:manage") && !can(a, "feedback:write:any") && !can(a, "career:manage")) throw forbidden();
  const term = q.trim();
  if (term.length < 2) return [];
  return getDb()
    .select({
      id: employees.id,
      name: employees.fullName,
      registration: employees.registrationNumber,
      position: jobPositions.title,
      department: departments.name,
      unit: units.name,
    })
    .from(employees)
    .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
    .innerJoin(departments, eq(departments.id, employees.departmentId))
    .innerJoin(units, eq(units.id, employees.unitId))
    .where(and(ne(employees.status, "desligado"), or(textSearch([employees.fullName, employees.preferredName], term), eq(employees.registrationNumber, term), sql`${employees.registrationNumber} LIKE ${`${term.replace(/\D/g, "") || "x"}%`}`)))
    .orderBy(asc(employees.fullName))
    .limit(limit);
}
