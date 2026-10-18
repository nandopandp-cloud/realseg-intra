import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { audienceType, createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";
import { jobFamilies } from "./org";
import { fileAssets } from "./platform";

export const courseCategories = pgTable("course_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

export const courseStatus = pgEnum("course_status", ["draft", "published", "archived"]);

export const courses = pgTable(
  "courses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => courseCategories.id, { onDelete: "restrict" }),
    /** Caminho de imagem pública e não sensível (capa). */
    coverImage: text("cover_image"),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    /** Prazo (dias corridos após a matrícula) para cursos obrigatórios. */
    mandatoryDueDays: integer("mandatory_due_days"),
    /** Regra de emissão: certificado só é emitido se true e o curso estiver 100% concluído. */
    issuesCertificate: boolean("issues_certificate").notNull().default(false),
    status: courseStatus("status").notNull().default("draft"),
    publishedAt: tsz("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("courses_category_idx").on(t.categoryId), index("courses_status_idx").on(t.status)],
);

export const courseAudiences = pgTable(
  "course_audiences",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    type: audienceType("type").notNull(),
    refId: uuid("ref_id"),
  },
  (t) => [index("course_audiences_course_idx").on(t.courseId)],
);

export const courseModules = pgTable(
  "course_modules",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [unique("course_modules_position_uq").on(t.courseId, t.position)],
);

export const lessonType = pgEnum("lesson_type", ["texto", "video", "material"]);

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => courseModules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: lessonType("type").notNull(),
    content: text("content").notNull().default(""),
    /** Somente provedores permitidos pelo CSP (YouTube nocookie / Vimeo). */
    videoUrl: text("video_url"),
    materialFileId: uuid("material_file_id").references(() => fileAssets.id, { onDelete: "set null" }),
    durationMinutes: integer("duration_minutes").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [unique("lessons_position_uq").on(t.moduleId, t.position)],
);

export const enrollmentSource = pgEnum("enrollment_source", ["self", "assigned"]);
export const enrollmentStatus = pgEnum("enrollment_status", ["em_andamento", "concluido"]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: enrollmentSource("source").notNull().default("self"),
    status: enrollmentStatus("status").notNull().default("em_andamento"),
    /** Cache derivado de lesson_progress, recalculado na mesma transação. */
    progressPercent: integer("progress_percent").notNull().default(0),
    lastLessonId: uuid("last_lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    dueAt: tsz("due_at"),
    enrolledAt: tsz("enrolled_at").notNull().defaultNow(),
    completedAt: tsz("completed_at"),
    updatedAt: updatedAt(),
  },
  (t) => [unique("enrollments_uq").on(t.courseId, t.userId), index("enrollments_user_idx").on(t.userId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: tsz("completed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.enrollmentId, t.lessonId] })],
);

export const certificates = pgTable("certificates", {
  id: id(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .unique()
    .references(() => enrollments.id, { onDelete: "restrict" }),
  /** Código público de verificação (não sequencial). */
  code: text("code").notNull().unique(),
  issuedAt: tsz("issued_at").notNull().defaultNow(),
});

export const learningPaths = pgTable("learning_paths", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  /** Trilha associada a uma família profissional (usada em "Minha carreira"). */
  jobFamilyId: uuid("job_family_id").references(() => jobFamilies.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

export const learningPathCourses = pgTable(
  "learning_path_courses",
  {
    pathId: uuid("path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.pathId, t.courseId] })],
);
