import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/app-link";
import { ArrowRight, Award, ChartColumn, ChevronRight, GraduationCap, Play } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs } from "@/components/ui/navigation";
import { Card, EmptyState, ProgressBar, ProgressRing, SectionHeader } from "@/components/ui/primitives";
import { CourseCard } from "@/features/courses/course-card";
import { CourseCategoryChips } from "@/features/courses/category-chips";
import { cn } from "@/lib/cn";
import { fmtMinutes } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { continueLearning, listCourseCategories, listCourses, listLearningPaths, myLearningSummary, type CourseFilter } from "@/server/services/courses";

export const metadata: Metadata = { title: "Cursos" };

const params = z.object({
  categoria: z.string().max(50).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  filtro: z.enum(["todos", "obrigatorios", "em-andamento", "concluidos", "nao-iniciados"]).optional().catch(undefined),
});

export default async function CoursesPage({ searchParams }: PageProps<"/cursos">) {
  const ctx = await requireCtx();
  const sp = params.parse(await searchParams);
  const browsing = !!(sp.categoria || sp.q || sp.filtro);
  const [categories, courses, cont, summary, paths] = await Promise.all([
    listCourseCategories(),
    listCourses(ctx, { category: sp.categoria, q: sp.q, filter: (sp.filtro ?? "todos") as CourseFilter }),
    continueLearning(ctx),
    myLearningSummary(ctx),
    listLearningPaths(ctx),
  ]);
  // Recomendados: o que falta fazer, sem repetir o curso de "Continuar assistindo"; obrigatórios primeiro.
  const recommended = courses
    .filter((c) => c.enrollmentStatus !== "concluido" && c.slug !== cont?.slug)
    .sort((a, b) => Number(b.isMandatory) - Number(a.isMandatory))
    .slice(0, 4);
  const filterHref = (f?: string) => {
    const p = new URLSearchParams();
    if (sp.categoria) p.set("categoria", sp.categoria);
    if (sp.q) p.set("q", sp.q);
    if (f) p.set("filtro", f);
    return `/cursos${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHero
        eyebrow="Desenvolvimento"
        title="Cursos"
        subtitle="Acesse conteúdos e desenvolva suas habilidades."
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Cursos" }]}
        image="/images/hero-cursos.webp"
        mobileImage="/images/mhero-cursos.webp"
      >
        <SearchField label="Buscar cursos" placeholder="Buscar cursos, temas ou áreas..." defaultValue={sp.q} hidden={{ categoria: sp.categoria, filtro: sp.filtro }} size="lg" className="max-w-[41rem]" />
      </PageHero>
      <PageBody>
        <CourseCategoryChips categories={categories} active={sp.categoria} />

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="flex min-w-0 flex-col gap-7">
            {browsing ? (
              <section aria-labelledby="resultado">
                <h2 id="resultado" className="text-xl font-bold text-ink">
                  {sp.q ? `Resultados para “${sp.q}”` : sp.categoria ? categories.find((c) => c.slug === sp.categoria)?.name ?? "Cursos" : "Todos os cursos"}
                </h2>
                <LinkTabs
                  label="Situação dos cursos"
                  className="mt-2"
                  items={[
                    { href: filterHref(), label: "Todos", active: !sp.filtro || sp.filtro === "todos" },
                    { href: filterHref("obrigatorios"), label: "Obrigatórios", active: sp.filtro === "obrigatorios" },
                    { href: filterHref("em-andamento"), label: "Em andamento", active: sp.filtro === "em-andamento" },
                    { href: filterHref("concluidos"), label: "Concluídos", active: sp.filtro === "concluidos" },
                    { href: filterHref("nao-iniciados"), label: "Não iniciados", active: sp.filtro === "nao-iniciados" },
                  ]}
                />
                {courses.length === 0 ? (
                  <EmptyState className="mt-5" icon={GraduationCap} title="Nenhum curso encontrado" description="Tente outra categoria ou palavra-chave." action={<ButtonLink href="/cursos" variant="outline">Ver todos os cursos</ButtonLink>} />
                ) : (
                  <ul className="mt-4 grid grid-cols-1 gap-2.5 min-[1440px]:grid-cols-2 sm:gap-3">
                    {courses.map((c) => (
                      <li key={c.id}>
                        <CourseCard c={c} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <>
                <section aria-labelledby="continuar">
                  <SectionHeader title="Continuar assistindo" id="continuar" href="/cursos?filtro=em-andamento" className="mb-3" />
                  {cont ? (
                    <Card className="relative flex items-center gap-3 p-2.5 sm:gap-5 sm:p-3">
                      <span className="relative aspect-[4/3] w-[7.5rem] shrink-0 overflow-hidden rounded-xl sm:aspect-[16/10] sm:w-56" aria-hidden>
                        {cont.coverImage && <Image src={cont.coverImage} alt="" fill sizes="(min-width: 640px) 224px, 120px" className="object-cover" />}
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/95 text-ink shadow sm:size-14">
                            <Play className="ml-0.5 size-4 fill-current sm:ml-1 sm:size-6" />
                          </span>
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-muted uppercase sm:text-xs">{cont.category.name}</p>
                        {/* O título é o link principal; a área clicável cobre o card inteiro. */}
                        <Link href={`/cursos/${cont.slug}/continuar`} className="mt-1 block leading-snug font-bold text-ink after:absolute after:inset-0 after:rounded-[var(--radius-card)] sm:text-lg" aria-label={`Continuar ${cont.title}`}>
                          {cont.title}
                        </Link>
                        <div className="mt-2 flex items-center gap-3 sm:mt-3">
                          <ProgressBar value={cont.progressPercent ?? 0} label={`Progresso: ${cont.progressPercent ?? 0}%`} className="max-w-64" />
                          <span className="text-sm text-muted">{cont.progressPercent ?? 0}%</span>
                        </div>
                        <p className="mt-1.5 text-sm text-muted sm:mt-2">
                          Aula {cont.currentLessonNumber} de {cont.lessonCount} • {fmtMinutes(cont.remainingMinutes)} restantes
                        </p>
                      </div>
                      <span className={cn(buttonClasses("primary", "md"), "pointer-events-none relative mr-3 hidden sm:inline-flex")} aria-hidden>
                        <Play className="size-4 fill-current" /> Continuar
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-ink/70 sm:hidden" aria-hidden />
                    </Card>
                  ) : (
                    <EmptyState icon={Play} title="Nenhum curso em andamento" description="Escolha um curso abaixo e comece quando quiser. Seu progresso fica salvo." />
                  )}
                </section>
                <section aria-labelledby="recomendados">
                  <SectionHeader title="Cursos recomendados" id="recomendados" href="/cursos?filtro=todos" className="mb-3" />
                  {recommended.length === 0 ? (
                    <EmptyState icon={GraduationCap} title="Você concluiu todos os cursos disponíveis" description="Novos cursos aparecerão aqui." />
                  ) : (
                    <ul className="grid grid-cols-1 gap-2.5 min-[1440px]:grid-cols-2 sm:gap-3">
                      {recommended.map((c) => (
                        <li key={c.id}>
                          <CourseCard c={c} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>

          <aside className="flex flex-col gap-5">
            <Card className="p-5" aria-labelledby="progresso">
              <h2 id="progresso" className="text-lg font-bold text-ink">
                Meu progresso
              </h2>
              <div className="mt-4 flex items-center gap-5">
                <ProgressRing value={summary.percent} size={120} />
                <ul className="flex-1 space-y-2.5 text-[0.9375rem]">
                  <li className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-brand-600" aria-hidden />
                    <span className="flex-1 text-muted">Cursos concluídos</span>
                    <span className="font-semibold text-ink">{summary.concluidos}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-600" aria-hidden />
                    <span className="flex-1 text-muted">Em andamento</span>
                    <span className="font-semibold text-ink">{summary.emAndamento}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-subtle" aria-hidden />
                    <span className="flex-1 text-muted">Não iniciados</span>
                    <span className="font-semibold text-ink">{summary.naoIniciados}</span>
                  </li>
                </ul>
              </div>
              <Link href="/cursos?filtro=concluidos" className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-line px-4 hover:bg-canvas">
                <ChartColumn className="size-5 text-brand-600" aria-hidden />
                <span className="flex-1 text-[0.9375rem] font-medium text-ink">Ver meu histórico</span>
                <ChevronRight className="size-5 text-ink/70" aria-hidden />
              </Link>
            </Card>
            <Card className="p-5" aria-labelledby="trilhas">
              <SectionHeader title="Trilhas de aprendizagem" id="trilhas" as="h2" href="/cursos/trilhas" linkLabel="Ver todas" className="[&_h2]:text-lg" />
              <ul className="mt-1 divide-y divide-line">
                {paths.map((p) => {
                  const Icon = iconFor(p.icon);
                  const tone = toTone(p.color);
                  return (
                    <li key={p.id}>
                      <Link href={`/cursos/trilhas/${p.slug}`} className="flex min-h-16 items-center gap-3 py-3 hover:bg-canvas">
                        <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                          <Icon className="size-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{p.title}</span>
                          <span className="block text-sm text-muted">
                            {p.courseCount} cursos • {fmtMinutes(p.minutes)}
                          </span>
                          <span className="mt-1.5 flex items-center gap-2">
                            <ProgressBar value={p.percent} label={`${p.title}: ${p.percent}% concluído`} className="h-1 max-w-32" />
                            <span className="text-xs text-muted">{p.percent}%</span>
                          </span>
                        </span>
                        <ChevronRight className="size-5 text-ink/70" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </aside>
        </div>

        <div className="mt-7 flex flex-col gap-4 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-5 sm:flex-row sm:items-center">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600" aria-hidden>
            <Award className="size-7" />
          </span>
          <div className="flex-1">
            <p className="text-lg font-bold text-ink">Conquiste novos conhecimentos</p>
            <p className="text-[0.9375rem] text-muted">Complete os cursos e receba seus certificados, fortalecendo sua carreira na REALSEG.</p>
          </div>
          <ButtonLink href="/cursos/certificados" iconRight={<ArrowRight className="size-5" aria-hidden />}>
            Ver meus certificados
          </ButtonLink>
        </div>
      </PageBody>
    </>
  );
}
