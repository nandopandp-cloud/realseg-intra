import { getTableName, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Actor } from "../auth/actor";

/**
 * Referência de coluna SEMPRE qualificada ("tabela"."coluna").
 * Necessária em subconsultas correlacionadas: em SELECT de tabela única o Drizzle omite o prefixo,
 * e `"id"` dentro de uma subconsulta resolveria para a coluna da tabela interna.
 */
export function ref(column: AnyPgColumn): SQL {
  return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}

type AudienceTable = PgTable & { type: AnyPgColumn; refId: AnyPgColumn };

/**
 * Cláusula SQL "o colaborador pertence ao público" para tabelas de regras (announcement_audiences, course_audiences…).
 * `emptyMeansAll`: sem regras = todos (oportunidades); com false, exige regra explícita (comunicados/cursos).
 */
export function audienceMatch<T extends AudienceTable>(
  table: T,
  fkColumn: AnyPgColumn,
  entityId: AnyPgColumn,
  actor: Actor,
  opts: { emptyMeansAll?: boolean } = {},
): SQL {
  const e = actor.employee;
  if (!e) return sql`false`;
  const match = sql`EXISTS (
    SELECT 1 FROM ${table} a
    WHERE a.${sql.identifier(fkColumn.name)} = ${ref(entityId)}
      AND (
        a.type = 'all'
        OR (a.type = 'department' AND a.ref_id = ${e.departmentId})
        OR (a.type = 'unit' AND a.ref_id = ${e.unitId})
        OR (a.type = 'job_position' AND a.ref_id = ${e.jobPositionId})
        OR (a.type = 'job_family' AND a.ref_id = ${e.jobFamilyId})
      )
  )`;
  if (!opts.emptyMeansAll) return match;
  return sql`(${match} OR NOT EXISTS (SELECT 1 FROM ${table} a WHERE a.${sql.identifier(fkColumn.name)} = ${ref(entityId)}))`;
}

/** Busca sem acento e sem diferenciar maiúsculas (usa f_unaccent da migração 0001). */
export function textSearch(columns: AnyPgColumn[], q: string | undefined | null): SQL | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  const pattern = `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  return sql`(${sql.join(
    columns.map((c) => sql`f_unaccent(${c}) ILIKE f_unaccent(${pattern})`),
    sql` OR `,
  )})`;
}
