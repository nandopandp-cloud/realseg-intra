import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getCourse } from "@/server/services/courses";

/** "Continuar de onde parou": leva à primeira aula não concluída (ou à última acessada). */
export default async function ContinueCoursePage({ params }: PageProps<"/cursos/[slug]/continuar">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const c = await orNotFound(getCourse(ctx, slug));
  redirect(c.resumeLessonId ? `/cursos/${slug}/aulas/${c.resumeLessonId}` : `/cursos/${slug}`);
}
