import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { audit } from "../audit";
import { requireEmployee, requirePermission, type Ctx } from "../auth/actor";
import { shortCode } from "../auth/crypto";
import { getDb, type Executor } from "../db/client";
import {
  achievements,
  certificates,
  courseAudiences,
  courseCategories,
  courseModules,
  courses,
  enrollments,
  learningPathCourses,
  learningPaths,
  lessonProgress,
  lessons,
} from "../db/schema";
import { notFound } from "../errors";
import { audienceMatch, textSearch, ref } from "./audience";
import { notify } from "./notifications";

/** Curso publicado e elegível ao ator — aplicado em todas as consultas do colaborador. */
function eligible(ctx: Ctx): SQL {
  return and(eq(courses.status, "published"), audienceMatch(courseAudiences, courseAudiences.courseId, courses.id, ctx.actor))!;
}

const lessonCountSql = sql<number>`(SELECT count(*)::int FROM ${lessons} l JOIN ${courseModules} m ON m.id = l.module_id WHERE m.course_id = ${ref(courses.id)})`;
const durationSql = sql<number>`(SELECT coalesce(sum(l.duration_minutes),0)::int FROM ${lessons} l JOIN ${courseModules} m ON m.id = l.module_id WHERE m.course_id = ${ref(courses.id)})`;

const cardFields = (userId: string) => ({
  id: courses.id,
  slug: courses.slug,
  title: courses.title,
  summary: courses.summary,
  coverImage: courses.coverImage,
  isMandatory: courses.isMandatory,
  issuesCertificate: courses.issuesCertificate,
  category: { slug: courseCategories.slug, name: courseCategories.name, color: courseCategories.color, icon: courseCategories.icon },
  lessonCount: lessonCountSql,
  durationMinutes: durationSql,
  progressPercent: sql<number | null>`(SELECT e.progress_percent FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId})`,
  enrollmentStatus: sql<"em_andamento" | "concluido" | null>`(SELECT e.status FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId})`,
});

export type CourseFilter = "todos" | "obrigatorios" | "em-andamento" | "concluidos" | "nao-iniciados";

export async function listCourses(ctx: Ctx, opts: { category?: string; q?: string; filter?: CourseFilter } = {}) {
  requirePermission(ctx.actor, "course:read");
  const userId = ctx.actor.userId;
  const enrolled = (status?: string) =>
    sql`EXISTS (SELECT 1 FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId}${status ? sql` AND e.status = ${status}` : sql``})`;
  const filter: Record<CourseFilter, SQL | undefined> = {
    todos: undefined,
    obrigatorios: eq(courses.isMandatory, true),
    "em-andamento": enrolled("em_andamento"),
    concluidos: enrolled("concluido"),
    "nao-iniciados": sql`NOT ${enrolled()}`,
  };
  return getDb()
    .select(cardFields(userId))
    .from(courses)
    .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
    .where(and(eligible(ctx), opts.category ? eq(courseCategories.slug, opts.category) : undefined, textSearch([courses.title, courses.summary], opts.q), filter[opts.filter ?? "todos"]))
    .orderBy(desc(courses.isMandatory), asc(courses.title));
}

export async function listCourseCategories() {
  return getDb().select().from(courseCategories).orderBy(asc(courseCategories.position));
}

/** Curso mais recente em andamento ("Continuar assistindo"). */
export async function continueLearning(ctx: Ctx) {
  requirePermission(ctx.actor, "course:read");
  const [row] = await getDb()
    .select({
      ...cardFields(ctx.actor.userId),
      lastLessonId: enrollments.lastLessonId,
      completedLessons: sql<number>`(SELECT count(*)::int FROM ${lessonProgress} p WHERE p.enrollment_id = ${ref(enrollments.id)})`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
    .where(and(eq(enrollments.userId, ctx.actor.userId), eq(enrollments.status, "em_andamento"), eligible(ctx)))
    // Prioriza o curso com atividade real (alguma aula concluída) e mais recente.
    .orderBy(desc(sql`${enrollments.progressPercent} > 0`), desc(enrollments.updatedAt))
    .limit(1);
  if (!row) return null;
  const remaining = await getDb()
    .select({ minutes: sql<number>`coalesce(sum(${lessons.durationMinutes}),0)::int` })
    .from(lessons)
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .where(
      and(
        eq(courseModules.courseId, row.id),
        sql`NOT EXISTS (SELECT 1 FROM ${lessonProgress} p JOIN ${enrollments} e ON e.id = p.enrollment_id WHERE p.lesson_id = ${ref(lessons.id)} AND e.user_id = ${ctx.actor.userId})`,
      ),
    );
  return { ...row, remainingMinutes: remaining[0].minutes, currentLessonNumber: Math.min(row.lessonCount, row.completedLessons + 1) };
}

export async function myLearningSummary(ctx: Ctx) {
  requirePermission(ctx.actor, "course:read");
  const userId = ctx.actor.userId;
  const [row] = await getDb()
    .select({
      total: count(),
      concluidos: sql<number>`count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId} AND e.status = 'concluido'))`.mapWith(Number),
      emAndamento: sql<number>`count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId} AND e.status = 'em_andamento'))`.mapWith(Number),
      obrigatoriosPendentes: sql<number>`count(*) FILTER (WHERE ${ref(courses.isMandatory)} AND NOT EXISTS (SELECT 1 FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId} AND e.status = 'concluido'))`.mapWith(Number),
    })
    .from(courses)
    .where(eligible(ctx));
  const naoIniciados = row.total - row.concluidos - row.emAndamento;
  return { ...row, naoIniciados, percent: row.total ? Math.round((row.concluidos / row.total) * 100) : 0 };
}

export async function listLearningPaths(ctx: Ctx) {
  requirePermission(ctx.actor, "course:read");
  const userId = ctx.actor.userId;
  const rows = await getDb()
    .select({
      id: learningPaths.id,
      slug: learningPaths.slug,
      title: learningPaths.title,
      description: learningPaths.description,
      color: learningPaths.color,
      icon: learningPaths.icon,
      jobFamilyId: learningPaths.jobFamilyId,
      courseCount: sql<number>`count(${courses.id})::int`,
      minutes: sql<number>`coalesce(sum(${durationSql}),0)::int`,
      completed: sql<number>`count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.user_id = ${userId} AND e.status = 'concluido'))::int`,
    })
    .from(learningPaths)
    .innerJoin(learningPathCourses, eq(learningPathCourses.pathId, learningPaths.id))
    .innerJoin(courses, and(eq(courses.id, learningPathCourses.courseId), eligible(ctx)))
    .groupBy(learningPaths.id)
    .orderBy(asc(learningPaths.position));
  return rows.map((r) => ({ ...r, percent: r.courseCount ? Math.round((r.completed / r.courseCount) * 100) : 0 }));
}

export async function getLearningPath(ctx: Ctx, slug: string) {
  requirePermission(ctx.actor, "course:read");
  const [path] = await getDb().select().from(learningPaths).where(eq(learningPaths.slug, slug));
  if (!path) throw notFound("Trilha");
  const items = await getDb()
    .select({ ...cardFields(ctx.actor.userId), position: learningPathCourses.position })
    .from(learningPathCourses)
    .innerJoin(courses, eq(courses.id, learningPathCourses.courseId))
    .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
    .where(and(eq(learningPathCourses.pathId, path.id), eligible(ctx)))
    .orderBy(asc(learningPathCourses.position));
  return { ...path, courses: items };
}

async function findEligibleCourse(ctx: Ctx, where: SQL) {
  requirePermission(ctx.actor, "course:read");
  const [row] = await getDb()
    .select({ ...cardFields(ctx.actor.userId), description: courses.description, mandatoryDueDays: courses.mandatoryDueDays })
    .from(courses)
    .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
    .where(and(where, eligible(ctx)))
    .limit(1);
  if (!row) throw notFound("Curso");
  return row;
}

export async function getCourse(ctx: Ctx, slug: string) {
  const course = await findEligibleCourse(ctx, eq(courses.slug, slug));
  const db = getDb();
  const [mods, lessonRows, [enrollment]] = await Promise.all([
    db.select().from(courseModules).where(eq(courseModules.courseId, course.id)).orderBy(asc(courseModules.position)),
    db
      .select({ id: lessons.id, moduleId: lessons.moduleId, title: lessons.title, type: lessons.type, durationMinutes: lessons.durationMinutes, position: lessons.position })
      .from(lessons)
      .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
      .where(eq(courseModules.courseId, course.id))
      .orderBy(asc(courseModules.position), asc(lessons.position)),
    db.select().from(enrollments).where(and(eq(enrollments.courseId, course.id), eq(enrollments.userId, ctx.actor.userId))),
  ]);
  const done = enrollment ? new Set((await db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollment.id))).map((r) => r.lessonId)) : new Set<string>();
  const certificate = enrollment ? (await db.select().from(certificates).where(eq(certificates.enrollmentId, enrollment.id)))[0] ?? null : null;
  const ordered = lessonRows.map((l) => ({ ...l, completed: done.has(l.id) }));
  const nextLesson = ordered.find((l) => !l.completed) ?? null;
  return {
    ...course,
    modules: mods.map((m) => ({ ...m, lessons: ordered.filter((l) => l.moduleId === m.id) })),
    lessons: ordered,
    enrollment: enrollment ?? null,
    certificate,
    resumeLessonId: enrollment?.lastLessonId && !done.has(enrollment.lastLessonId) ? enrollment.lastLessonId : (nextLesson?.id ?? ordered[0]?.id ?? null),
  };
}

/** Matrícula idempotente. */
export async function enroll(ctx: Ctx, courseId: string, db: Executor = getDb()) {
  requirePermission(ctx.actor, "course:enroll");
  requireEmployee(ctx.actor);
  const course = await findEligibleCourse(ctx, eq(courses.id, courseId));
  await db
    .insert(enrollments)
    .values({ courseId, userId: ctx.actor.userId, source: "self", dueAt: course.isMandatory && course.mandatoryDueDays ? new Date(Date.now() + course.mandatoryDueDays * 86400_000) : null })
    .onConflictDoNothing();
  const [e] = await db.select().from(enrollments).where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, ctx.actor.userId)));
  return e;
}

async function lessonWithCourse(ctx: Ctx, lessonId: string) {
  const [l] = await getDb()
    .select({ lesson: lessons, courseId: courseModules.courseId, moduleTitle: courseModules.title })
    .from(lessons)
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .where(eq(lessons.id, lessonId));
  if (!l) throw notFound("Aula");
  await findEligibleCourse(ctx, eq(courses.id, l.courseId));
  return l;
}

export async function getLesson(ctx: Ctx, slug: string, lessonId: string) {
  const course = await getCourse(ctx, slug);
  const idx = course.lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) throw notFound("Aula");
  const [full] = await getDb().select().from(lessons).where(eq(lessons.id, lessonId));
  if (course.enrollment) {
    await getDb().update(enrollments).set({ lastLessonId: lessonId, updatedAt: new Date() }).where(eq(enrollments.id, course.enrollment.id));
  }
  return { course, lesson: { ...full, completed: course.lessons[idx].completed, number: idx + 1 }, prev: course.lessons[idx - 1] ?? null, next: course.lessons[idx + 1] ?? null };
}

/**
 * Conclui uma aula (idempotente). Recalcula progresso na mesma transação; ao atingir 100%
 * marca o curso como concluído, emite certificado (se a regra do curso permitir) e concede conquista.
 */
export async function completeLesson(ctx: Ctx, lessonId: string) {
  requirePermission(ctx.actor, "course:enroll");
  const e = requireEmployee(ctx.actor);
  const { courseId } = await lessonWithCourse(ctx, lessonId);
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const enrollment = await enroll(ctx, courseId, tx);
    // Serializa conclusões concorrentes da mesma matrícula.
    await tx.execute(sql`SELECT 1 FROM ${enrollments} WHERE id = ${enrollment.id} FOR UPDATE`);
    await tx.insert(lessonProgress).values({ enrollmentId: enrollment.id, lessonId }).onConflictDoNothing();
    const [{ total }] = await tx
      .select({ total: count() })
      .from(lessons)
      .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
      .where(eq(courseModules.courseId, courseId));
    const [{ done }] = await tx.select({ done: count() }).from(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollment.id));
    const percent = total ? Math.round((done / total) * 100) : 0;
    const completedNow = percent === 100 && enrollment.status !== "concluido";
    await tx
      .update(enrollments)
      .set({ progressPercent: percent, lastLessonId: lessonId, updatedAt: new Date(), ...(completedNow ? { status: "concluido" as const, completedAt: new Date() } : {}) })
      .where(eq(enrollments.id, enrollment.id));
    let certificateId: string | null = null;
    if (completedNow) {
      const [course] = await tx.select().from(courses).where(eq(courses.id, courseId));
      if (course.issuesCertificate) {
        const [cert] = await tx.insert(certificates).values({ enrollmentId: enrollment.id, code: shortCode(10) }).onConflictDoNothing().returning();
        certificateId = cert?.id ?? null;
        if (cert) await audit({ action: "certificate.issued", actorUserId: ctx.actor.userId, entityType: "certificate", entityId: cert.id, meta: ctx.meta }, tx);
      }
      await tx
        .insert(achievements)
        .values({ employeeId: e.id, kind: "auto", code: "first_course_completed", title: "Primeiro curso concluído", description: course.title, icon: "star", color: "teal" })
        .onConflictDoNothing();
      await audit({ action: "course.completed", actorUserId: ctx.actor.userId, entityType: "course", entityId: courseId, meta: ctx.meta }, tx);
      await notify([ctx.actor.userId], { category: "cursos", title: "Curso concluído", body: course.title, link: `/cursos/${course.slug}`, entityType: "course", entityId: courseId }, tx);
    }
    return { percent, completedNow, certificateId };
  });
  return result;
}

export async function listMyCertificates(ctx: Ctx) {
  requirePermission(ctx.actor, "course:read");
  return getDb()
    .select({ id: certificates.id, code: certificates.code, issuedAt: certificates.issuedAt, courseTitle: courses.title, courseSlug: courses.slug, durationMinutes: durationSql })
    .from(certificates)
    .innerJoin(enrollments, eq(enrollments.id, certificates.enrollmentId))
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.userId, ctx.actor.userId))
    .orderBy(desc(certificates.issuedAt));
}

export async function getMyCertificate(ctx: Ctx, id: string) {
  const certs = await listMyCertificates(ctx);
  const c = certs.find((x) => x.id === id);
  if (!c) throw notFound("Certificado");
  return { ...c, holderName: ctx.actor.employee?.fullName ?? ctx.actor.email };
}

/** Histórico de capacitação (concluídos). */
export async function trainingHistory(ctx: Ctx) {
  requirePermission(ctx.actor, "course:read");
  return getDb()
    .select({ courseTitle: courses.title, courseSlug: courses.slug, completedAt: enrollments.completedAt, durationMinutes: durationSql })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(eq(enrollments.userId, ctx.actor.userId), eq(enrollments.status, "concluido")))
    .orderBy(desc(enrollments.completedAt));
}

export async function coursesByIds(ctx: Ctx, ids: string[]) {
  if (!ids.length) return [];
  return getDb()
    .select(cardFields(ctx.actor.userId))
    .from(courses)
    .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
    .where(and(inArray(courses.id, ids), eligible(ctx)));
}
