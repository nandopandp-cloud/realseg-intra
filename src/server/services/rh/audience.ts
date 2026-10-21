import { inArray, sql, type SQL } from "drizzle-orm";
import type { Executor } from "../../db/client";
import { departments, jobFamilies, jobPositions, units, type AudienceType } from "../../db/schema";
import { validation } from "../../errors";

/** Público-alvo como o formulário da gestão o edita (convertido em linhas de regra na gravação). */
export type AudienceInput = { all: boolean; department: string[]; unit: string[]; job_position: string[]; job_family: string[] };
export type AudienceRule = { type: AudienceType; refId: string | null };

export const EMPTY_AUDIENCE: AudienceInput = { all: false, department: [], unit: [], job_position: [], job_family: [] };

export function toRules(a: AudienceInput): AudienceRule[] {
  if (a.all) return [{ type: "all", refId: null }];
  return (["department", "unit", "job_position", "job_family"] as const).flatMap((type) => [...new Set(a[type])].map((refId) => ({ type, refId })));
}

export function fromRules(rules: Array<{ type: AudienceType; refId: string | null }>): AudienceInput {
  const out: AudienceInput = { all: false, department: [], unit: [], job_position: [], job_family: [] };
  for (const r of rules) {
    if (r.type === "all") out.all = true;
    else if (r.refId) out[r.type].push(r.refId);
  }
  return out;
}

/** Recusa ids de estrutura inexistentes (o cliente não decide o que existe). */
export async function assertAudienceRefs(db: Executor, a: AudienceInput) {
  const checks: Array<[string[], () => Promise<Array<{ id: string }>>, string]> = [
    [a.department, () => db.select({ id: departments.id }).from(departments).where(inArray(departments.id, a.department)), "área"],
    [a.unit, () => db.select({ id: units.id }).from(units).where(inArray(units.id, a.unit)), "unidade"],
    [a.job_position, () => db.select({ id: jobPositions.id }).from(jobPositions).where(inArray(jobPositions.id, a.job_position)), "cargo"],
    [a.job_family, () => db.select({ id: jobFamilies.id }).from(jobFamilies).where(inArray(jobFamilies.id, a.job_family)), "família"],
  ];
  for (const [ids, q, what] of checks) {
    if (!ids.length) continue;
    const found = new Set((await q()).map((r) => r.id));
    if (ids.some((id) => !found.has(id))) throw validation(`Público-alvo inválido: ${what} não encontrada.`, { audience: [`Revise a seleção de ${what}.`] });
  }
}

/**
 * Condição "o colaborador `e` (employees) com cargo `jp` (job_positions) pertence ao público da entidade".
 * Mesma regra aplicada ao colaborador em `audienceMatch` (services/audience.ts), agora do lado da gestão.
 */
export function employeeInAudience(rulesTable: string, fkColumn: string, entityId: string, opts: { emptyMeansAll?: boolean } = {}): SQL {
  const t = sql.identifier(rulesTable);
  const fk = sql.identifier(fkColumn);
  const match = sql`EXISTS (
    SELECT 1 FROM ${t} a WHERE a.${fk} = ${entityId} AND (
      a.type = 'all'
      OR (a.type = 'department' AND a.ref_id = e.department_id)
      OR (a.type = 'unit' AND a.ref_id = e.unit_id)
      OR (a.type = 'job_position' AND a.ref_id = e.job_position_id)
      OR (a.type = 'job_family' AND a.ref_id = jp.family_id)
    ))`;
  if (!opts.emptyMeansAll) return match;
  return sql`(${match} OR NOT EXISTS (SELECT 1 FROM ${t} a WHERE a.${fk} = ${entityId}))`;
}

/** Usuários com acesso (conta ativa, colaborador não desligado) que pertencem ao público. */
export async function audienceUserIds(db: Executor, rulesTable: string, fkColumn: string, entityId: string, opts: { emptyMeansAll?: boolean } = {}) {
  const r = await db.execute<{ user_id: string }>(sql`
    SELECT e.user_id FROM employees e
    JOIN job_positions jp ON jp.id = e.job_position_id
    JOIN users u ON u.id = e.user_id
    WHERE e.status <> 'desligado' AND u.status = 'active' AND u.deleted_at IS NULL
      AND ${employeeInAudience(rulesTable, fkColumn, entityId, opts)}`);
  return r.rows.map((x) => x.user_id);
}

/** Público em texto (ex.: "Todos os colaboradores", "Unidade São Paulo", "Cargo: Vigilante"). */
export async function describeAudience(db: Executor, a: AudienceInput): Promise<string[]> {
  if (a.all) return ["Todos os colaboradores"];
  const pick = async <T extends { name: string }>(ids: string[], q: () => Promise<T[]>) => (ids.length ? (await q()).map((r) => r.name) : []);
  const [d, u, p, f] = await Promise.all([
    pick(a.department, () => db.select({ name: departments.name }).from(departments).where(inArray(departments.id, a.department))),
    pick(a.unit, () => db.select({ name: units.name }).from(units).where(inArray(units.id, a.unit))),
    pick(a.job_position, () => db.select({ name: jobPositions.title }).from(jobPositions).where(inArray(jobPositions.id, a.job_position))),
    pick(a.job_family, () => db.select({ name: jobFamilies.name }).from(jobFamilies).where(inArray(jobFamilies.id, a.job_family))),
  ]);
  const out = [...d.map((n) => `Área: ${n}`), ...u.map((n) => `Unidade: ${n}`), ...p.map((n) => `Cargo: ${n}`), ...f.map((n) => `Família: ${n}`)];
  return out.length ? out : ["Ninguém (defina o público)"];
}
