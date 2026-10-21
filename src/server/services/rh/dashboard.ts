import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { can, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { announcements, documentCategories, documentSubmissions, employees, enrollments, courses, internalOpportunities, opportunityApplications } from "../../db/schema";
import { queueSummary } from "./tickets";

/**
 * Painel da gestão: cada bloco só é calculado (e exibido) para quem tem a permissão correspondente.
 * Números agregados — nenhum dado sensível individual.
 */
export async function rhDashboard(ctx: Ctx) {
  const a = ctx.actor;
  const db = getDb();
  const [tickets, submissions, people, content, learning, career] = await Promise.all([
    can(a, "ticket:read:any") ? queueSummary(ctx) : null,
    can(a, "submission:review")
      ? Promise.all([
          db.select({ n: count() }).from(documentSubmissions).where(inArray(documentSubmissions.status, ["enviado", "em_analise"])),
          db
            .select({
              id: documentSubmissions.id,
              number: documentSubmissions.number,
              title: documentSubmissions.title,
              status: documentSubmissions.status,
              createdAt: documentSubmissions.createdAt,
              employeeName: employees.fullName,
              categoryName: documentCategories.name,
            })
            .from(documentSubmissions)
            .innerJoin(employees, eq(employees.id, documentSubmissions.employeeId))
            .innerJoin(documentCategories, eq(documentCategories.id, documentSubmissions.categoryId))
            .where(inArray(documentSubmissions.status, ["enviado", "em_analise"]))
            .orderBy(asc(documentSubmissions.createdAt))
            .limit(5),
        ]).then(([[{ n }], oldest]) => ({ pending: n, oldest }))
      : null,
    can(a, "employee:read:any")
      ? db
          .select({
            ativos: sql<number>`count(*) FILTER (WHERE ${employees.status} = 'ativo')`.mapWith(Number),
            afastados: sql<number>`count(*) FILTER (WHERE ${employees.status} = 'afastado')`.mapWith(Number),
            admissoes30: sql<number>`count(*) FILTER (WHERE ${employees.admissionDate}::date >= current_date - 30)`.mapWith(Number),
          })
          .from(employees)
          .then(([r]) => r)
      : null,
    can(a, "announcement:manage")
      ? db
          .select({
            publicados30: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'published' AND ${announcements.publishedAt} >= now() - interval '30 days')`.mapWith(Number),
            agendados: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'scheduled')`.mapWith(Number),
            rascunhos: sql<number>`count(*) FILTER (WHERE ${announcements.status} = 'draft')`.mapWith(Number),
          })
          .from(announcements)
          .then(([r]) => r)
      : null,
    can(a, "course:report")
      ? db
          .select({
            obrigatoriosAtrasados: sql<number>`count(*) FILTER (WHERE ${enrollments.status} = 'em_andamento' AND ${enrollments.dueAt} < now())`.mapWith(Number),
            emAndamento: sql<number>`count(*) FILTER (WHERE ${enrollments.status} = 'em_andamento')`.mapWith(Number),
            concluidos30: sql<number>`count(*) FILTER (WHERE ${enrollments.completedAt} >= now() - interval '30 days')`.mapWith(Number),
            cursosPublicados: sql<number>`(SELECT count(*) FROM ${courses} WHERE status = 'published')`.mapWith(Number),
          })
          .from(enrollments)
          .then(([r]) => r)
      : null,
    can(a, "career:manage")
      ? Promise.all([
          db.select({ n: count() }).from(internalOpportunities).where(eq(internalOpportunities.status, "published")),
          db
            .select({ n: count() })
            .from(opportunityApplications)
            .where(and(inArray(opportunityApplications.status, ["enviada", "em_analise"]))),
        ]).then(([[o], [ap]]) => ({ abertas: o.n, candidaturas: ap.n }))
      : null,
  ]);
  return { tickets, submissions, people, content, learning, career };
}
