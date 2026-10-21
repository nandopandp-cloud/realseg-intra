import { asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { audit } from "../../audit";
import { canManage, requirePermission, type Ctx } from "../../auth/actor";
import { getDb, type Executor } from "../../db/client";
import { departments, jobFamilies, jobPositions, units } from "../../db/schema";
import { forbidden, notFound, validation } from "../../errors";
import { ref } from "../audience";

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

// ── Gestão da estrutura (Estrutura › áreas, unidades, famílias e cargos) ─────

const activeIn = (column: "department_id" | "unit_id" | "job_position_id", id: SQL | string) =>
  sql<number>`(SELECT count(*) FROM employees e WHERE e.${sql.identifier(column)} = ${id} AND e.status <> 'desligado')`.mapWith(Number);

export async function structureOverview(ctx: Ctx) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  const parent = alias(departments, "parent");
  const [deps, uns, fams, pos] = await Promise.all([
    db
      .select({ id: departments.id, code: departments.code, name: departments.name, parentId: departments.parentId, parentName: parent.name, active: departments.active, people: activeIn("department_id", ref(departments.id)) })
      .from(departments)
      .leftJoin(parent, eq(parent.id, departments.parentId))
      .orderBy(desc(departments.active), asc(departments.name)),
    db
      .select({ id: units.id, name: units.name, city: units.city, state: units.state, active: units.active, people: activeIn("unit_id", ref(units.id)) })
      .from(units)
      .orderBy(desc(units.active), asc(units.name)),
    db
      .select({ id: jobFamilies.id, name: jobFamilies.name, description: jobFamilies.description, positions: sql<number>`(SELECT count(*) FROM job_positions p WHERE p.family_id = ${ref(jobFamilies.id)})`.mapWith(Number) })
      .from(jobFamilies)
      .orderBy(asc(jobFamilies.name)),
    db
      .select({
        id: jobPositions.id,
        title: jobPositions.title,
        familyId: jobPositions.familyId,
        familyName: jobFamilies.name,
        level: jobPositions.level,
        levelLabel: jobPositions.levelLabel,
        description: jobPositions.description,
        requirements: jobPositions.requirements,
        progressionCriteria: jobPositions.progressionCriteria,
        active: jobPositions.active,
        people: activeIn("job_position_id", ref(jobPositions.id)),
      })
      .from(jobPositions)
      .innerJoin(jobFamilies, eq(jobFamilies.id, jobPositions.familyId))
      .orderBy(asc(jobFamilies.name), asc(jobPositions.level)),
  ]);
  return { departments: deps, units: uns, families: fams, positions: pos };
}

async function blockIfPeople(db: Executor, column: "department_id" | "unit_id" | "job_position_id", id: string, what: string) {
  const r = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM employees e WHERE e.${sql.identifier(column)} = ${id} AND e.status <> 'desligado'`);
  const n = r.rows[0].n;
  if (n > 0) throw validation(`Há ${n} ${n === 1 ? "colaborador ativo" : "colaboradores ativos"} ${what}. Transfira-os antes de desativar.`);
}

async function track(ctx: Ctx, db: Executor, created: boolean, entityType: string, entityId: string) {
  await audit({ action: created ? "org.created" : "org.updated", actorUserId: ctx.actor.userId, entityType, entityId, meta: ctx.meta }, db);
}

const uniqueViolation = (err: unknown) => (err as { code?: string })?.code === "23505" || (err as { cause?: { code?: string } })?.cause?.code === "23505";

export async function saveDepartment(ctx: Ctx, id: string | null, input: { code: string; name: string; parentId?: string | null; active: boolean }) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  return db.transaction(async (tx) => {
    if (input.parentId && input.parentId === id) throw validation("Uma área não pode ser subordinada a ela mesma.", { parentId: ["Escolha outra área."] });
    if (id && !input.active) await blockIfPeople(tx, "department_id", id, "nesta área");
    const values = { code: input.code.trim().toUpperCase(), name: input.name.trim(), parentId: input.parentId || null, active: input.active };
    try {
      const [row] = id
        ? await tx.update(departments).set({ ...values, updatedAt: new Date() }).where(eq(departments.id, id)).returning({ id: departments.id })
        : await tx.insert(departments).values(values).returning({ id: departments.id });
      if (!row) throw notFound("Área");
      await track(ctx, tx, !id, "department", row.id);
      return row;
    } catch (err) {
      if (uniqueViolation(err)) throw validation("Já existe uma área com este código.", { code: ["Use outro código."] });
      throw err;
    }
  });
}

export async function saveUnit(ctx: Ctx, id: string | null, input: { name: string; city: string; state: string; active: boolean }) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  return db.transaction(async (tx) => {
    if (id && !input.active) await blockIfPeople(tx, "unit_id", id, "nesta unidade");
    const values = { name: input.name.trim(), city: input.city.trim(), state: input.state.trim().toUpperCase(), active: input.active };
    try {
      const [row] = id ? await tx.update(units).set(values).where(eq(units.id, id)).returning({ id: units.id }) : await tx.insert(units).values(values).returning({ id: units.id });
      if (!row) throw notFound("Unidade");
      await track(ctx, tx, !id, "unit", row.id);
      return row;
    } catch (err) {
      if (uniqueViolation(err)) throw validation("Já existe uma unidade com este nome.", { name: ["Use outro nome."] });
      throw err;
    }
  });
}

export async function saveFamily(ctx: Ctx, id: string | null, input: { name: string; description?: string | null }) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  try {
    const values = { name: input.name.trim(), description: input.description?.trim() || null };
    const [row] = id ? await db.update(jobFamilies).set(values).where(eq(jobFamilies.id, id)).returning({ id: jobFamilies.id }) : await db.insert(jobFamilies).values(values).returning({ id: jobFamilies.id });
    if (!row) throw notFound("Família");
    await track(ctx, db, !id, "job_family", row.id);
    return row;
  } catch (err) {
    if (uniqueViolation(err)) throw validation("Já existe uma família com este nome.", { name: ["Use outro nome."] });
    throw err;
  }
}

export async function deleteFamily(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(jobPositions).where(eq(jobPositions.familyId, id));
  if (n > 0) throw validation("Esta família tem cargos. Mova ou exclua os cargos antes.");
  const rows = await db.delete(jobFamilies).where(eq(jobFamilies.id, id)).returning({ id: jobFamilies.id });
  if (!rows.length) throw notFound("Família");
  await track(ctx, db, false, "job_family", id);
}

export async function savePosition(
  ctx: Ctx,
  id: string | null,
  input: { title: string; familyId: string; level: number; levelLabel: string; description?: string | null; requirements?: string | null; progressionCriteria?: string | null; active: boolean },
) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [fam] = await tx.select({ id: jobFamilies.id }).from(jobFamilies).where(eq(jobFamilies.id, input.familyId));
    if (!fam) throw validation("Família inválida.", { familyId: ["Escolha uma família da lista."] });
    if (id && !input.active) await blockIfPeople(tx, "job_position_id", id, "neste cargo");
    const values = {
      title: input.title.trim(),
      familyId: input.familyId,
      level: input.level,
      levelLabel: input.levelLabel.trim(),
      description: input.description?.trim() || null,
      requirements: input.requirements?.trim() || null,
      progressionCriteria: input.progressionCriteria?.trim() || null,
      active: input.active,
    };
    const [row] = id
      ? await tx.update(jobPositions).set({ ...values, updatedAt: new Date() }).where(eq(jobPositions.id, id)).returning({ id: jobPositions.id })
      : await tx.insert(jobPositions).values(values).returning({ id: jobPositions.id });
    if (!row) throw notFound("Cargo");
    await track(ctx, tx, !id, "job_position", row.id);
    return row;
  });
}
