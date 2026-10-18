import { authed } from "@/server/http/route";
import { parseSlug } from "@/server/http/params";
import { enroll, getCourse } from "@/server/services/courses";

/** Matrícula idempotente. */
export const POST = authed<{ slug: string }>({ permission: "course:enroll" }, async ({ actor, meta, params }) => {
  const ctx = { actor, meta };
  const course = await getCourse(ctx, parseSlug(params.slug, "Curso"));
  const e = await enroll(ctx, course.id);
  return { enrollmentId: e.id, status: e.status, resumeLessonId: course.resumeLessonId };
});
