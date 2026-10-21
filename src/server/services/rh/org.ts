import { asc, eq } from "drizzle-orm";
import { canManage, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { departments, jobFamilies, jobPositions, units } from "../../db/schema";
import { forbidden } from "../../errors";

export type OrgOptions = Awaited<ReturnType<typeof orgOptions>>;

/** Estrutura organizacional ativa para seletores (público-alvo, cadastro de colaborador, oportunidades…). */
export async function orgOptions(ctx: Ctx) {
  if (!canManage(ctx.actor)) throw forbidden();
  const db = getDb();
  const [deps, uns, fams, pos] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.active, true)).orderBy(asc(departments.name)),
    db.select({ id: units.id, name: units.name, city: units.city, state: units.state }).from(units).where(eq(units.active, true)).orderBy(asc(units.name)),
    db.select({ id: jobFamilies.id, name: jobFamilies.name }).from(jobFamilies).orderBy(asc(jobFamilies.name)),
    db
      .select({ id: jobPositions.id, name: jobPositions.title, level: jobPositions.levelLabel, familyId: jobPositions.familyId, familyName: jobFamilies.name })
      .from(jobPositions)
      .innerJoin(jobFamilies, eq(jobFamilies.id, jobPositions.familyId))
      .where(eq(jobPositions.active, true))
      .orderBy(asc(jobFamilies.name), asc(jobPositions.level)),
  ]);
  return { departments: deps, units: uns, families: fams, positions: pos };
}
