import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb, type Executor } from "../../db/client";
import {
  courseAudiences,
  courseCategories,
  courseModules,
  courses,
  enrollments,
  jobFamilies,
  learningPathCourses,
  learningPaths,
  lessonProgress,
  lessons,
} from "../../db/schema";
import { invalidTransition, notFound, validation } from "../../errors";
import { ref, textSearch } from "../audience";
import { notify } from "../notifications";
import { assertAudienceRefs, audienceUserIds, describeAudience, employeeInAudience, fromRules, toRules, type AudienceInput } from "./audience";

export const COURSE_TABS = ["todos", "publicados", "rascunhos", "arquivados"] as const;
const TAB_STATUS = { publicados: "published", rascunhos: "draft", arquivados: "archived" } as const;

/** "Segurança no trabalho!" → "seguranca-no-trabalho". */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Converte links comuns de vídeo para os players permitidos pela CSP (YouTube sem cookies e Vimeo).
 * Retorna null para links de outros provedores.
 */
export function normalizeVideoUrl(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const yt = (id: string | null) => (id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null);
  if (host === "youtube-nocookie.com" && u.pathname.startsWith("/embed/")) return yt(u.pathname.split("/")[2]);
  if (host === "youtube.com" || host === "m.youtube.com") return u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/") ? yt(u.pathname.split("/")[2]) : yt(u.searchParams.get("v"));
  if (host === "youtu.be") return yt(u.pathname.slice(1));
  if (host === "player.vimeo.com" && /^\/video\/\d+$/.test(u.pathname)) return `https://player.vimeo.com${u.pathname}`;
  if (host === "vimeo.com" && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  return null;
}

const lessonCount = sql<number>`(SELECT count(*)::int FROM ${lessons} l JOIN ${courseModules} m ON m.id = l.module_id WHERE m.course_id = ${ref(courses.id)})`.mapWith(Number);
const durationSql = sql<number>`(SELECT coalesce(sum(l.duration_minutes),0)::int FROM ${lessons} l JOIN ${courseModules} m ON m.id = l.module_id WHERE m.course_id = ${ref(courses.id)})`.mapWith(Number);
const enrolledCount = sql<number>`(SELECT count(*)::int FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)})`.mapWith(Number);
const completedCount = sql<number>`(SELECT count(*)::int FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.status = 'concluido')`.mapWith(Number);
const overdueCount = sql<number>`(SELECT count(*)::int FROM ${enrollments} e WHERE e.course_id = ${ref(courses.id)} AND e.status = 'em_andamento' AND e.due_at < now())`.mapWith(Number);

export async function listCoursesAdmin(ctx: Ctx, opts: { tab?: (typeof COURSE_TABS)[number]; q?: string; category?: string } = {}) {
  requirePermission(ctx.actor, "course:manage");
  const tab = opts.tab ?? "todos";
  const base = and(textSearch([courses.title, courses.summary], opts.q), opts.category ? eq(courseCategories.slug, opts.category) : undefined);
  const db = getDb();
  const [items, [counts]] = await Promise.all([
    db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        status: courses.status,
        isMandatory: courses.isMandatory,
        issuesCertificate: courses.issuesCertificate,
        coverImage: courses.coverImage,
        updatedAt: courses.updatedAt,
        category: { name: courseCategories.name, color: courseCategories.color, icon: courseCategories.icon },
        lessonCount,
        durationMinutes: durationSql,
        enrolled: enrolledCount,
        completed: completedCount,
        overdue: overdueCount,
      })
      .from(courses)
      .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
      .where(and(base, tab === "todos" ? undefined : eq(courses.status, TAB_STATUS[tab])))
      .orderBy(sql`CASE ${courses.status} WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END`, desc(courses.isMandatory), asc(courses.title)),
    db
      .select({
        todos: count(),
        publicados: sql<number>`count(*) FILTER (WHERE ${courses.status} = 'published')`.mapWith(Number),
        rascunhos: sql<number>`count(*) FILTER (WHERE ${courses.status} = 'draft')`.mapWith(Number),
        arquivados: sql<number>`count(*) FILTER (WHERE ${courses.status} = 'archived')`.mapWith(Number),
      })
      .from(courses)
      .innerJoin(courseCategories, eq(courseCategories.id, courses.categoryId))
      .where(base),
  ]);
  return { items, counts };
}

async function findCourse(id: string, db: Executor = getDb()) {
  const [c] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!c) throw notFound("Curso");
  return c;
}

export async function getCourseAdmin(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "course:manage");
  const db = getDb();
  const c = await findCourse(id);
  const [[cat], rules, mods, lessonRows, [stats], paths] = await Promise.all([
    db.select().from(courseCategories).where(eq(courseCategories.id, c.categoryId)),
    db.select({ type: courseAudiences.type, refId: courseAudiences.refId }).from(courseAudiences).where(eq(courseAudiences.courseId, id)),
    db.select().from(courseModules).where(eq(courseModules.courseId, id)).orderBy(asc(courseModules.position)),
    db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        title: lessons.title,
        type: lessons.type,
        content: lessons.content,
        videoUrl: lessons.videoUrl,
        durationMinutes: lessons.durationMinutes,
        position: lessons.position,
        completions: sql<number>`(SELECT count(*)::int FROM ${lessonProgress} p WHERE p.lesson_id = ${ref(lessons.id)})`.mapWith(Number),
      })
      .from(lessons)
      .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
      .where(eq(courseModules.courseId, id))
      .orderBy(asc(courseModules.position), asc(lessons.position)),
    db.select({ enrolled: enrolledCount, completed: completedCount, overdue: overdueCount, lessonCount, durationMinutes: durationSql }).from(courses).where(eq(courses.id, id)),
    db
      .select({ id: learningPaths.id, title: learningPaths.title })
      .from(learningPathCourses)
      .innerJoin(learningPaths, eq(learningPaths.id, learningPathCourses.pathId))
      .where(eq(learningPathCourses.courseId, id)),
  ]);
  const audience = fromRules(rules);
  const [{ size }] = await db
    .execute<{ size: number }>(sql`SELECT count(*)::int AS size FROM employees e JOIN job_positions jp ON jp.id = e.job_position_id JOIN users u ON u.id = e.user_id WHERE e.status <> 'desligado' AND u.status = 'active' AND ${employeeInAudience("course_audiences", "course_id", id)}`)
    .then((r) => r.rows);
  return {
    ...c,
    categorySlug: cat.slug,
    category: cat,
    audience,
    audienceLabels: await describeAudience(db, audience),
    audienceSize: size,
    modules: mods.map((m) => ({ ...m, lessons: lessonRows.filter((l) => l.moduleId === m.id) })),
    stats,
    paths,
  };
}

export type CourseInput = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  categorySlug: string;
  coverImage: string | null;
  isMandatory: boolean;
  mandatoryDueDays: number | null;
  issuesCertificate: boolean;
  audience: AudienceInput;
};

async function resolveCourse(db: Executor, input: CourseInput, selfId?: string) {
  const [cat] = await db.select().from(courseCategories).where(eq(courseCategories.slug, input.categorySlug));
  if (!cat) throw validation("Categoria inválida.", { categorySlug: ["Escolha uma categoria."] });
  const [dup] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, input.slug));
  if (dup && dup.id !== selfId) throw validation("Já existe um curso com este endereço.", { slug: ["Use outro endereço (slug)."] });
  await assertAudienceRefs(db, input.audience);
  return cat;
}

const courseValues = (input: CourseInput, categoryId: string) => ({
  title: input.title.trim(),
  slug: input.slug,
  summary: input.summary.trim(),
  description: input.description.trim(),
  categoryId,
  coverImage: input.coverImage,
  isMandatory: input.isMandatory,
  mandatoryDueDays: input.isMandatory ? input.mandatoryDueDays : null,
  issuesCertificate: input.issuesCertificate,
});

async function replaceCourseAudience(tx: Executor, id: string, a: AudienceInput) {
  await tx.delete(courseAudiences).where(eq(courseAudiences.courseId, id));
  await tx.insert(courseAudiences).values(toRules(a).map((r) => ({ courseId: id, ...r })));
}

export async function createCourse(ctx: Ctx, input: CourseInput) {
  requirePermission(ctx.actor, "course:manage");
  return getDb().transaction(async (tx) => {
    const cat = await resolveCourse(tx, input);
    const [row] = await tx.insert(courses).values({ ...courseValues(input, cat.id), status: "draft" }).returning({ id: courses.id });
    await replaceCourseAudience(tx, row.id, input.audience);
    await tx.insert(courseModules).values({ courseId: row.id, title: "Módulo 1", position: 1 });
    await audit({ action: "course.created", actorUserId: ctx.actor.userId, entityType: "course", entityId: row.id, meta: ctx.meta }, tx);
    return row;
  });
}

export async function updateCourse(ctx: Ctx, id: string, input: CourseInput) {
  requirePermission(ctx.actor, "course:manage");
  await getDb().transaction(async (tx) => {
    await findCourse(id, tx);
    const cat = await resolveCourse(tx, input, id);
    await tx.update(courses).set({ ...courseValues(input, cat.id), updatedAt: new Date() }).where(eq(courses.id, id));
    await replaceCourseAudience(tx, id, input.audience);
    await audit({ action: "course.updated", actorUserId: ctx.actor.userId, entityType: "course", entityId: id, meta: ctx.meta }, tx);
  });
}

/** Publicar exige ao menos uma aula; arquivar tira do catálogo (matrículas e certificados são preservados). */
export async function setCourseStatus(ctx: Ctx, id: string, status: "draft" | "published" | "archived") {
  requirePermission(ctx.actor, "course:manage");
  const db = getDb();
  const c = await findCourse(id);
  if (status === "published") {
    const [{ n }] = await db.select({ n: count() }).from(lessons).innerJoin(courseModules, eq(courseModules.id, lessons.moduleId)).where(eq(courseModules.courseId, id));
    if (!n) throw invalidTransition("Adicione ao menos uma aula antes de publicar.");
  }
  await db
    .update(courses)
    .set({ status, publishedAt: status === "published" ? (c.publishedAt ?? new Date()) : c.publishedAt, updatedAt: new Date() })
    .where(eq(courses.id, id));
  await audit({ action: "course.status_changed", actorUserId: ctx.actor.userId, entityType: "course", entityId: id, metadata: { from: c.status, to: status }, meta: ctx.meta });
}

// ── Módulos e aulas ──────────────────────────────────────────────────────────

/** Recalcula o progresso das matrículas após mudança de conteúdo (concluídos permanecem concluídos). */
async function recalcProgress(tx: Executor, courseId: string) {
  await tx.execute(sql`
    UPDATE enrollments e
    SET progress_percent = CASE WHEN t.total = 0 THEN 0
          ELSE LEAST(100, round(100.0 * (SELECT count(*) FROM lesson_progress p WHERE p.enrollment_id = e.id) / t.total))::int END
    FROM (SELECT count(*) AS total FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ${courseId}) t
    WHERE e.course_id = ${courseId} AND e.status = 'em_andamento'`);
}

async function moduleOf(tx: Executor, moduleId: string) {
  const [m] = await tx.select().from(courseModules).where(eq(courseModules.id, moduleId));
  if (!m) throw notFound("Módulo");
  return m;
}

export async function addModule(ctx: Ctx, courseId: string, title: string) {
  requirePermission(ctx.actor, "course:manage");
  return getDb().transaction(async (tx) => {
    await findCourse(courseId, tx);
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${courseModules.position}),0)`.mapWith(Number) }).from(courseModules).where(eq(courseModules.courseId, courseId));
    const [m] = await tx.insert(courseModules).values({ courseId, title: title.trim(), position: max + 1 }).returning({ id: courseModules.id });
    return m;
  });
}

export async function renameModule(ctx: Ctx, moduleId: string, title: string) {
  requirePermission(ctx.actor, "course:manage");
  const rows = await getDb().update(courseModules).set({ title: title.trim() }).where(eq(courseModules.id, moduleId)).returning({ id: courseModules.id });
  if (!rows.length) throw notFound("Módulo");
}

/** Exclui módulo (e suas aulas). Bloqueado se alguma aula já foi concluída por alguém. */
export async function deleteModule(ctx: Ctx, moduleId: string) {
  requirePermission(ctx.actor, "course:manage");
  await getDb().transaction(async (tx) => {
    const m = await moduleOf(tx, moduleId);
    const [{ n }] = await tx.select({ n: count() }).from(lessonProgress).innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId)).where(eq(lessons.moduleId, moduleId));
    if (n) throw invalidTransition("Há colaboradores que já concluíram aulas deste módulo. Para preservar o histórico, edite as aulas em vez de excluir.");
    await tx.delete(courseModules).where(eq(courseModules.id, moduleId));
    await renumber(tx, "course_modules", "course_id", m.courseId);
    await recalcProgress(tx, m.courseId);
  });
}

/** Reposiciona sequencialmente (1..n) respeitando a ordem atual — usa posições negativas temporárias por causa do índice único. */
async function renumber(tx: Executor, table: "course_modules" | "lessons", parentCol: "course_id" | "module_id", parentId: string) {
  const t = sql.identifier(table);
  const p = sql.identifier(parentCol);
  await tx.execute(sql`UPDATE ${t} SET position = -position WHERE ${p} = ${parentId}`);
  await tx.execute(sql`
    UPDATE ${t} x SET position = r.rn FROM (
      SELECT id, row_number() OVER (ORDER BY -position) AS rn FROM ${t} WHERE ${p} = ${parentId}
    ) r WHERE x.id = r.id`);
}

async function swap(tx: Executor, table: "course_modules" | "lessons", parentCol: "course_id" | "module_id", parentId: string, id: string, dir: -1 | 1) {
  const t = sql.identifier(table);
  const p = sql.identifier(parentCol);
  const rows = (await tx.execute<{ id: string; position: number }>(sql`SELECT id, position FROM ${t} WHERE ${p} = ${parentId} ORDER BY position`)).rows;
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  await tx.execute(sql`UPDATE ${t} SET position = -1 WHERE id = ${rows[i].id}`);
  await tx.execute(sql`UPDATE ${t} SET position = ${rows[i].position} WHERE id = ${rows[j].id}`);
  await tx.execute(sql`UPDATE ${t} SET position = ${rows[j].position} WHERE id = ${rows[i].id}`);
}

export async function moveModule(ctx: Ctx, moduleId: string, dir: -1 | 1) {
  requirePermission(ctx.actor, "course:manage");
  await getDb().transaction(async (tx) => {
    const m = await moduleOf(tx, moduleId);
    await swap(tx, "course_modules", "course_id", m.courseId, moduleId, dir);
  });
}

export type LessonInput = { title: string; type: "texto" | "video" | "material"; content: string; videoUrl: string | null; durationMinutes: number };

function lessonValues(input: LessonInput) {
  const videoUrl = input.type === "video" ? normalizeVideoUrl(input.videoUrl) : null;
  if (input.type === "video" && !videoUrl) throw validation("Link de vídeo inválido.", { videoUrl: ["Use um link do YouTube ou do Vimeo."] });
  if (input.type !== "video" && !input.content.trim()) throw validation("Escreva o conteúdo da aula.", { content: ["Escreva o conteúdo da aula."] });
  return { title: input.title.trim(), type: input.type, content: input.content.trim(), videoUrl, durationMinutes: input.durationMinutes };
}

export async function addLesson(ctx: Ctx, moduleId: string, input: LessonInput) {
  requirePermission(ctx.actor, "course:manage");
  return getDb().transaction(async (tx) => {
    const m = await moduleOf(tx, moduleId);
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${lessons.position}),0)`.mapWith(Number) }).from(lessons).where(eq(lessons.moduleId, moduleId));
    const [l] = await tx.insert(lessons).values({ moduleId, position: max + 1, ...lessonValues(input) }).returning({ id: lessons.id });
    await recalcProgress(tx, m.courseId);
    await tx.update(courses).set({ updatedAt: new Date() }).where(eq(courses.id, m.courseId));
    return l;
  });
}

export async function updateLesson(ctx: Ctx, lessonId: string, input: LessonInput) {
  requirePermission(ctx.actor, "course:manage");
  const rows = await getDb().update(lessons).set(lessonValues(input)).where(eq(lessons.id, lessonId)).returning({ id: lessons.id });
  if (!rows.length) throw notFound("Aula");
}

export async function deleteLesson(ctx: Ctx, lessonId: string) {
  requirePermission(ctx.actor, "course:manage");
  await getDb().transaction(async (tx) => {
    const [l] = await tx.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!l) throw notFound("Aula");
    const [{ n }] = await tx.select({ n: count() }).from(lessonProgress).where(eq(lessonProgress.lessonId, lessonId));
    if (n) throw invalidTransition("Esta aula já foi concluída por colaboradores. Edite o conteúdo em vez de excluir, para preservar o histórico.");
    const m = await moduleOf(tx, l.moduleId);
    await tx.delete(lessons).where(eq(lessons.id, lessonId));
    await renumber(tx, "lessons", "module_id", l.moduleId);
    await recalcProgress(tx, m.courseId);
  });
}

export async function moveLesson(ctx: Ctx, lessonId: string, dir: -1 | 1) {
  requirePermission(ctx.actor, "course:manage");
  await getDb().transaction(async (tx) => {
    const [l] = await tx.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!l) throw notFound("Aula");
    await swap(tx, "lessons", "module_id", l.moduleId, lessonId, dir);
  });
}

// ── Atribuição e relatório ───────────────────────────────────────────────────

/**
 * Atribui o curso (matrícula "assigned" com prazo) a todo o público do curso ou a colaboradores escolhidos.
 * Quem já está matriculado não é duplicado; o prazo é aplicado a quem ainda não concluiu. Avisa os novos.
 */
export async function assignCourse(ctx: Ctx, courseId: string, input: { target: "audience" | "employees"; employeeIds?: string[]; dueDays: number | null }) {
  requirePermission(ctx.actor, "course:manage");
  return getDb().transaction(async (tx) => {
    const c = await findCourse(courseId, tx);
    if (c.status !== "published") throw invalidTransition("Publique o curso antes de atribuí-lo.");
    let userIds: string[];
    if (input.target === "audience") userIds = await audienceUserIds(tx, "course_audiences", "course_id", courseId);
    else {
      const ids = input.employeeIds ?? [];
      if (!ids.length) throw validation("Escolha ao menos um colaborador.", { employeeIds: ["Escolha ao menos um colaborador."] });
      const r = await tx.execute<{ user_id: string }>(sql`SELECT user_id FROM employees WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND status <> 'desligado'`);
      userIds = r.rows.map((x) => x.user_id);
    }
    if (!userIds.length) throw validation("Nenhum colaborador com acesso encontrado para atribuir.");
    const dueAt = input.dueDays ? new Date(Date.now() + input.dueDays * 86400_000) : null;
    const existing = new Set((await tx.select({ userId: enrollments.userId }).from(enrollments).where(and(eq(enrollments.courseId, courseId), inArray(enrollments.userId, userIds)))).map((e) => e.userId));
    const fresh = userIds.filter((u) => !existing.has(u));
    if (fresh.length) await tx.insert(enrollments).values(fresh.map((userId) => ({ courseId, userId, source: "assigned" as const, dueAt })));
    if (dueAt && existing.size)
      await tx
        .update(enrollments)
        .set({ dueAt, source: "assigned", updatedAt: new Date() })
        .where(and(eq(enrollments.courseId, courseId), inArray(enrollments.userId, [...existing]), eq(enrollments.status, "em_andamento")));
    await notify(fresh, { category: "cursos", title: `Curso atribuído a você: ${c.title}`, body: dueAt ? `Conclua até ${dueAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : undefined, link: `/cursos/${c.slug}`, entityType: "course", entityId: courseId }, tx);
    await audit({ action: "course.assigned", actorUserId: ctx.actor.userId, entityType: "course", entityId: courseId, metadata: { target: input.target, newEnrollments: fresh.length, updated: existing.size, dueDays: input.dueDays }, meta: ctx.meta }, tx);
    return { created: fresh.length, updated: existing.size };
  });
}

export const ENROLLMENT_FILTERS = ["todos", "em-andamento", "concluidos", "atrasados", "nao-iniciados"] as const;

/** Situação de cada pessoa do público no curso (inclusive quem ainda não começou). Exige `course:report`. */
export async function courseReport(ctx: Ctx, courseId: string, opts: { filter?: (typeof ENROLLMENT_FILTERS)[number]; q?: string } = {}) {
  requirePermission(ctx.actor, "course:report");
  const c = await findCourse(courseId);
  const filter = opts.filter ?? "todos";
  const term = opts.q?.trim();
  const rows = await getDb().execute<{ employee_id: string; name: string; registration: string; unit: string; position: string; status: string | null; progress: number | null; due_at: Date | null; completed_at: Date | null; enrolled_at: Date | null }>(sql`
    SELECT e.id AS employee_id, e.full_name AS name, e.registration_number AS registration, un.name AS unit, jp.title AS position,
           en.status, en.progress_percent AS progress, en.due_at, en.completed_at, en.enrolled_at
    FROM employees e
    JOIN job_positions jp ON jp.id = e.job_position_id
    JOIN units un ON un.id = e.unit_id
    JOIN users u ON u.id = e.user_id
    LEFT JOIN enrollments en ON en.course_id = ${courseId} AND en.user_id = e.user_id
    WHERE e.status <> 'desligado' AND u.status = 'active'
      AND (${employeeInAudience("course_audiences", "course_id", courseId)} OR en.id IS NOT NULL)
      ${term ? sql`AND (f_unaccent(e.full_name) ILIKE f_unaccent(${`%${term}%`}) OR e.registration_number = ${term})` : sql``}
    ORDER BY (en.status = 'em_andamento' AND en.due_at < now()) DESC NULLS LAST, en.status NULLS FIRST, e.full_name`);
  const items = rows.rows.map((r) => ({
    employeeId: r.employee_id,
    name: r.name,
    registration: r.registration,
    unit: r.unit,
    position: r.position,
    status: (r.status ?? null) as "em_andamento" | "concluido" | null,
    progress: r.progress ?? 0,
    dueAt: r.due_at ? new Date(r.due_at) : null,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    overdue: r.status === "em_andamento" && !!r.due_at && new Date(r.due_at) < new Date(),
  }));
  const totals = {
    people: items.length,
    notStarted: items.filter((i) => !i.status).length,
    inProgress: items.filter((i) => i.status === "em_andamento").length,
    completed: items.filter((i) => i.status === "concluido").length,
    overdue: items.filter((i) => i.overdue).length,
  };
  const filtered = items.filter((i) =>
    filter === "em-andamento" ? i.status === "em_andamento" : filter === "concluidos" ? i.status === "concluido" : filter === "atrasados" ? i.overdue : filter === "nao-iniciados" ? !i.status : true,
  );
  return { course: { id: c.id, title: c.title, slug: c.slug, isMandatory: c.isMandatory, status: c.status }, totals, items: filtered };
}

// ── Trilhas e categorias ─────────────────────────────────────────────────────

export async function listPathsAdmin(ctx: Ctx) {
  requirePermission(ctx.actor, "course:manage");
  const db = getDb();
  const [paths, links] = await Promise.all([
    db
      .select({ id: learningPaths.id, slug: learningPaths.slug, title: learningPaths.title, description: learningPaths.description, color: learningPaths.color, icon: learningPaths.icon, jobFamilyId: learningPaths.jobFamilyId, familyName: jobFamilies.name, position: learningPaths.position })
      .from(learningPaths)
      .leftJoin(jobFamilies, eq(jobFamilies.id, learningPaths.jobFamilyId))
      .orderBy(asc(learningPaths.position), asc(learningPaths.title)),
    db
      .select({ pathId: learningPathCourses.pathId, courseId: learningPathCourses.courseId, position: learningPathCourses.position, title: courses.title, status: courses.status })
      .from(learningPathCourses)
      .innerJoin(courses, eq(courses.id, learningPathCourses.courseId))
      .orderBy(asc(learningPathCourses.position)),
  ]);
  return paths.map((p) => ({ ...p, courses: links.filter((l) => l.pathId === p.id) }));
}

export async function savePath(ctx: Ctx, id: string | null, input: { title: string; description: string; color: string; icon: string; jobFamilyId: string | null; courseIds: string[] }) {
  requirePermission(ctx.actor, "course:manage");
  return getDb().transaction(async (tx) => {
    const slug = slugify(input.title);
    const [dup] = await tx.select({ id: learningPaths.id }).from(learningPaths).where(eq(learningPaths.slug, slug));
    if (dup && dup.id !== id) throw validation("Já existe uma trilha com este nome.", { title: ["Use outro nome."] });
    const values = { title: input.title.trim(), slug, description: input.description.trim(), color: input.color, icon: input.icon, jobFamilyId: input.jobFamilyId || null };
    const [row] = id ? await tx.update(learningPaths).set(values).where(eq(learningPaths.id, id)).returning({ id: learningPaths.id }) : await tx.insert(learningPaths).values(values).returning({ id: learningPaths.id });
    if (!row) throw notFound("Trilha");
    await tx.delete(learningPathCourses).where(eq(learningPathCourses.pathId, row.id));
    const unique = [...new Set(input.courseIds)];
    if (unique.length) {
      const found = await tx.select({ id: courses.id }).from(courses).where(inArray(courses.id, unique));
      if (found.length !== unique.length) throw validation("Curso inválido na trilha.");
      await tx.insert(learningPathCourses).values(unique.map((courseId, i) => ({ pathId: row.id, courseId, position: i + 1 })));
    }
    await audit({ action: "learning_path.updated", actorUserId: ctx.actor.userId, entityType: "learning_path", entityId: row.id, meta: ctx.meta }, tx);
    return row;
  });
}

export async function deletePath(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "course:manage");
  const rows = await getDb().delete(learningPaths).where(eq(learningPaths.id, id)).returning({ id: learningPaths.id });
  if (!rows.length) throw notFound("Trilha");
  await audit({ action: "learning_path.updated", actorUserId: ctx.actor.userId, entityType: "learning_path", entityId: id, metadata: { deleted: true }, meta: ctx.meta });
}

export async function saveCourseCategory(ctx: Ctx, id: string | null, input: { name: string; color: string; icon: string }) {
  requirePermission(ctx.actor, "course:manage");
  const db = getDb();
  const slug = slugify(input.name);
  const [dup] = await db.select({ id: courseCategories.id }).from(courseCategories).where(eq(courseCategories.slug, slug));
  if (dup && dup.id !== id) throw validation("Já existe uma categoria com este nome.", { name: ["Use outro nome."] });
  if (id) {
    const rows = await db.update(courseCategories).set({ name: input.name.trim(), slug, color: input.color, icon: input.icon }).where(eq(courseCategories.id, id)).returning({ id: courseCategories.id });
    if (!rows.length) throw notFound("Categoria");
    return rows[0];
  }
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${courseCategories.position}),0)`.mapWith(Number) }).from(courseCategories);
  const [row] = await db.insert(courseCategories).values({ name: input.name.trim(), slug, color: input.color, icon: input.icon, position: max + 1 }).returning({ id: courseCategories.id });
  return row;
}

export async function courseOptions() {
  return getDb().select({ id: courses.id, title: courses.title, status: courses.status }).from(courses).orderBy(asc(courses.title));
}

/** Relatório do curso em CSV (separador ";"). Auditado. */
export async function courseReportCsv(ctx: Ctx, courseId: string) {
  requirePermission(ctx.actor, "report:export");
  const r = await courseReport(ctx, courseId);
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const status = (i: (typeof r.items)[number]) => (i.status === "concluido" ? "Concluído" : i.overdue ? "Atrasado" : i.status === "em_andamento" ? "Em andamento" : "Não iniciado");
  const lines = [
    "Nome;Matrícula;Cargo;Unidade;Situação;Progresso (%);Prazo;Concluído em",
    ...r.items.map((i) => [i.name, i.registration, i.position, i.unit, status(i), String(i.progress), fmt(i.dueAt), fmt(i.completedAt)].map(esc).join(";")),
  ];
  await audit({ action: "report.exported", actorUserId: ctx.actor.userId, entityType: "course", entityId: courseId, metadata: { report: "course", rows: r.items.length }, meta: ctx.meta });
  return { filename: `curso-${r.course.slug}.csv`, csv: "﻿" + lines.join("\r\n") };
}
