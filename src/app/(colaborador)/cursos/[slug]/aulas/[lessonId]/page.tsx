import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, CircleCheck, Circle } from "lucide-react";
import { Breadcrumbs, Card, ProgressBar } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { CompleteLessonButton } from "@/features/courses/course-actions";
import { cn } from "@/lib/cn";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { getLesson } from "@/server/services/courses";

export const metadata: Metadata = { title: "Aula" };

/** Somente provedores liberados no CSP (frame-src). */
function embedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "www.youtube-nocookie.com" || u.hostname === "player.vimeo.com") return u.toString();
  } catch {}
  return null;
}

export default async function LessonPage({ params }: PageProps<"/cursos/[slug]/aulas/[lessonId]">) {
  const ctx = await requireCtx();
  const { slug, lessonId } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !isUuid(lessonId)) notFound();
  const { course, lesson, prev, next } = await orNotFound(getLesson(ctx, slug, lessonId));
  if (!course.enrollment) redirect(`/cursos/${slug}`);
  const video = embedUrl(lesson.videoUrl);

  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Cursos", href: "/cursos" }, { label: course.title, href: `/cursos/${slug}` }, { label: `Aula ${lesson.number}` }]} />
      <Link href={`/cursos/${slug}`} className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> {course.title}
      </Link>
      <div className="mt-3 grid grid-cols-1 gap-6 lg:mt-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0">
          <p className="eyebrow">
            Aula {lesson.number} de {course.lessons.length}
          </p>
          <h1 className="mt-2 text-[1.875rem] leading-tight font-bold tracking-tight text-ink">{lesson.title.replace(/^Aula \d+:\s*/, "")}</h1>
          {video && (
            <div className="mt-5 aspect-video overflow-hidden rounded-[var(--radius-card)] bg-navy-950">
              <iframe src={video} title={lesson.title} className="size-full" allow="encrypted-media; picture-in-picture; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          )}
          <Card className="mt-5 p-5 sm:p-7" as="div">
            <RichText text={lesson.content} />
          </Card>
          <div className="mt-6">
            <CompleteLessonButton lessonId={lesson.id} completed={lesson.completed} nextHref={next ? `/cursos/${slug}/aulas/${next.id}` : null} courseHref={`/cursos/${slug}`} />
          </div>
          <nav aria-label="Navegação entre aulas" className="mt-8 flex justify-between gap-3 border-t border-line pt-5">
            {prev ? (
              <Link href={`/cursos/${slug}/aulas/${prev.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-600">
                <ChevronLeft className="size-5" aria-hidden /> Aula anterior
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/cursos/${slug}/aulas/${next.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-600">
                Próxima aula <ChevronRight className="size-5" aria-hidden />
              </Link>
            )}
          </nav>
        </article>
        <aside>
          <Card className="p-4">
            <p className="font-bold text-ink">{course.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={course.enrollment.progressPercent} label={`Progresso do curso: ${course.enrollment.progressPercent}%`} className="h-1.5" />
              <span className="text-xs text-muted">{course.enrollment.progressPercent}%</span>
            </div>
            <ol className="mt-3 flex flex-col">
              {course.lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/cursos/${slug}/aulas/${l.id}`} aria-current={l.id === lesson.id ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-[0.9375rem]", l.id === lesson.id ? "bg-brand-50 font-semibold text-brand-700" : "text-ink hover:bg-canvas")}>
                    {l.completed ? <CircleCheck className="size-4 shrink-0 text-green-700" aria-label="Concluída" /> : <Circle className="size-4 shrink-0 text-subtle" aria-label="Não concluída" />}
                    <span className="line-clamp-2">{l.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
