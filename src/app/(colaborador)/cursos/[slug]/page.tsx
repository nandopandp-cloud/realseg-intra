import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, CircleCheck, Circle, Clock, FileText, Play } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Breadcrumbs, Card, ProgressBar } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { EnrollButton } from "@/features/courses/course-actions";
import { fmtDate, fmtMinutes } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getCourse } from "@/server/services/courses";

export const metadata: Metadata = { title: "Curso" };

export default async function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const c = await orNotFound(getCourse(ctx, slug));
  const done = c.lessons.filter((l) => l.completed).length;
  const continueHref = c.enrollment && c.enrollment.status !== "concluido" ? `/cursos/${c.slug}/continuar` : null;
  const facts: Array<[string, string]> = [
    ["Área", c.category.name],
    ["Aulas", String(c.lessonCount)],
    ["Carga horária", fmtMinutes(c.durationMinutes)],
    ["Certificado", c.issuesCertificate ? "Sim, ao concluir" : "Não emite"],
    ["Tipo", c.isMandatory ? "Obrigatório" : "Opcional"],
  ];
  const panel = c.enrollment ? (
        <>
          <p className="font-bold text-ink">Seu progresso</p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={c.enrollment.progressPercent} label={`Progresso: ${c.enrollment.progressPercent}%`} />
            <span className="text-sm font-semibold text-ink">{c.enrollment.progressPercent}%</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {done} de {c.lessonCount} aulas concluídas
            {c.enrollment.dueAt && c.enrollment.status !== "concluido" && ` • Prazo: ${fmtDate(c.enrollment.dueAt)}`}
          </p>
          {c.enrollment.status === "concluido" ? (
            <>
              <p className="mt-4 text-[0.9375rem] text-green-700">Concluído em {c.enrollment.completedAt ? fmtDate(c.enrollment.completedAt) : "—"}.</p>
              {c.certificate && (
                <ButtonLink href={`/cursos/certificados/${c.certificate.id}`} className="mt-4 w-full" icon={<Award className="size-5" aria-hidden />}>
                  Ver certificado
                </ButtonLink>
              )}
            </>
          ) : (
            <ButtonLink href={`/cursos/${c.slug}/continuar`} size="lg" className="mt-4 w-full" icon={<Play className="size-5 fill-current" aria-hidden />}>
              {done > 0 ? "Continuar de onde parei" : "Começar primeira aula"}
            </ButtonLink>
          )}
        </>
      ) : (
        <>
          <p className="font-bold text-ink">{c.isMandatory ? "Curso obrigatório" : "Comece quando quiser"}</p>
          <p className="mt-1 text-[0.9375rem] text-muted">Seu progresso é salvo automaticamente a cada aula concluída.</p>
          <div className="mt-4 [&>button]:w-full">
            <EnrollButton slug={c.slug} label="Iniciar curso" />
          </div>
        </>
      );

  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Cursos", href: "/cursos" }, { label: c.title }]} />
      <Link href="/cursos" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Cursos
      </Link>
      <div className="mt-3 grid grid-cols-1 gap-6 lg:mt-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">{c.category.name}</Badge>
            {c.isMandatory && <Badge tone="amber">Obrigatório</Badge>}
            {c.enrollmentStatus === "concluido" && <Badge tone="green">Concluído</Badge>}
          </div>
          <h1 className="mt-3 text-[2rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">{c.title}</h1>
          <p className="mt-2 text-[1.0625rem] text-muted">{c.summary}</p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] text-muted">
            <li className="flex items-center gap-1.5">
              <FileText className="size-4" aria-hidden /> {c.lessonCount} aulas
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {fmtMinutes(c.durationMinutes)}
            </li>
            {c.issuesCertificate && (
              <li className="flex items-center gap-1.5">
                <Award className="size-4" aria-hidden /> Emite certificado
              </li>
            )}
          </ul>
          <Card className="mt-5 p-4 xl:hidden">{panel}</Card>
          {continueHref ? (
            <Link href={continueHref} className="relative mt-5 block aspect-[21/9] overflow-hidden rounded-[var(--radius-card)] bg-field hover:opacity-95" aria-label={`Continuar o curso ${c.title}`}>
              {c.coverImage && <Image src={c.coverImage} alt="" fill priority sizes="(min-width:1280px) 60vw, 100vw" className="object-cover" />}
            </Link>
          ) : (
            <div className="relative mt-5 aspect-[21/9] overflow-hidden rounded-[var(--radius-card)] bg-field">
              {c.coverImage && <Image src={c.coverImage} alt="" fill priority sizes="(min-width:1280px) 60vw, 100vw" className="object-cover" />}
            </div>
          )}
          <RichText text={c.description} className="prose-rs mt-6" />

          <section aria-labelledby="conteudo-curso" className="mt-8">
            <h2 id="conteudo-curso" className="text-xl font-bold text-ink">
              Conteúdo do curso
            </h2>
            <div className="mt-3 flex flex-col gap-4">
              {c.modules.map((m) => (
                <Card key={m.id} className="p-4" as="div">
                  <h3 className="font-bold text-ink">
                    Módulo {m.position}: {m.title}
                  </h3>
                  <ol className="mt-2 divide-y divide-line">
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        {c.enrollment ? (
                          <Link href={`/cursos/${c.slug}/aulas/${l.id}`} className="flex min-h-12 items-center gap-3 py-2 hover:bg-canvas">
                            {l.completed ? <CircleCheck className="size-5 shrink-0 text-green-700" aria-label="Concluída" /> : <Circle className="size-5 shrink-0 text-subtle" aria-label="Não concluída" />}
                            <span className="flex-1 text-ink">{l.title}</span>
                            <span className="text-sm text-muted">{l.durationMinutes} min</span>
                          </Link>
                        ) : (
                          <div className="flex min-h-12 items-center gap-3 py-2">
                            <Circle className="size-5 shrink-0 text-subtle" aria-hidden />
                            <span className="flex-1 text-ink">{l.title}</span>
                            <span className="text-sm text-muted">{l.durationMinutes} min</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden flex-col gap-4 xl:flex" aria-label="Progresso e informações do curso">
          <Card className="p-5">{panel}</Card>
          <Card className="p-5">
            <h2 className="font-bold text-ink">Sobre o curso</h2>
            <dl className="mt-2 space-y-2 text-[0.9375rem]">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
