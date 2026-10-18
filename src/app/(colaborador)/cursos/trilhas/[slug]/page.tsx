import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs, ProgressBar } from "@/components/ui/primitives";
import { CourseCard } from "@/features/courses/course-card";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getLearningPath } from "@/server/services/courses";

export const metadata: Metadata = { title: "Trilha de aprendizagem" };

export default async function LearningPathPage({ params }: PageProps<"/cursos/trilhas/[slug]">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const p = await orNotFound(getLearningPath(ctx, slug));
  const done = p.courses.filter((c) => c.enrollmentStatus === "concluido").length;
  const pct = p.courses.length ? Math.round((done / p.courses.length) * 100) : 0;
  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Cursos", href: "/cursos" }, { label: p.title }]} />
      <Link href="/cursos" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Cursos
      </Link>
      <p className="eyebrow mt-2 lg:mt-6">Trilha de aprendizagem</p>
      <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-ink sm:text-[2.5rem]">{p.title}</h1>
      <p className="mt-1 text-[1.0625rem] text-muted">{p.description}</p>
      <div className="mt-4 flex max-w-md items-center gap-3">
        <ProgressBar value={pct} label={`Trilha ${pct}% concluída`} />
        <span className="text-sm whitespace-nowrap text-muted">
          {done} de {p.courses.length} cursos
        </span>
      </div>
      <ol className="mt-6 grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {p.courses.map((c) => (
          <li key={c.id}>
            <CourseCard c={c} />
          </li>
        ))}
      </ol>
    </div>
  );
}
