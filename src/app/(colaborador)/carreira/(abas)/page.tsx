import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowRight, ChevronRight, Circle, CircleCheck, Play, Star, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Card, EmptyState, ProgressBar, ProgressRing, SectionHeader } from "@/components/ui/primitives";
import { OpportunityCard } from "@/features/career/opportunity-card";
import { CourseCard } from "@/features/courses/course-card";
import { cn } from "@/lib/cn";
import { fmtDateLong, fmtMonthYear } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { careerOverview } from "@/server/services/career";

export const metadata: Metadata = { title: "Minha carreira" };

const dateOf = (d: string) => new Date(`${d}T12:00:00Z`);

export default async function CareerOverviewPage() {
  const ctx = await requireCtx();
  const o = await careerOverview(ctx);
  const track = o.track;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5" aria-labelledby="meu-desenvolvimento">
            <SectionHeader title="Meu desenvolvimento" id="meu-desenvolvimento" href="/carreira/desenvolvimento" linkLabel="Ver detalhes" className="mb-3" />
            {track ? (
              <>
                <div className="flex items-center gap-4 sm:gap-6">
                  <ProgressRing value={track.percent} size={136} className="max-sm:!size-[6.75rem]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-ink">Trilha: {track.title}</p>
                    <p className="mt-1 text-[0.9375rem] text-muted">Conclua os próximos cursos e atividades para continuar evoluindo na sua carreira.</p>
                    <p className="mt-3 text-sm text-muted">
                      {track.completed} de {track.courseCount} etapas concluídas
                    </p>
                    <ProgressBar value={track.percent} label={`Trilha ${track.percent}% concluída`} className="mt-2" />
                  </div>
                </div>
                <Link
                  href={track.next ? (track.next.started ? `/cursos/${track.next.slug}/continuar` : `/cursos/${track.next.slug}`) : `/cursos/trilhas/${track.slug}`}
                  className="mt-5 flex min-h-14 items-center gap-3 rounded-xl bg-brand-50 px-4 text-brand-700 hover:bg-brand-100"
                >
                  <Play className="size-5 shrink-0 fill-current" aria-hidden />
                  <span className="min-w-0 flex-1 font-medium">
                    {track.next ? (
                      <>
                        Continuar minha trilha<span className="hidden sm:inline">: {track.next.title}</span>
                      </>
                    ) : (
                      "Trilha concluída — ver cursos da trilha"
                    )}
                  </span>
                  <ChevronRight className="size-5 shrink-0" aria-hidden />
                </Link>
              </>
            ) : (
              <EmptyState icon={Star} title="Nenhuma trilha associada ao seu cargo" description="Quando o RH definir uma trilha para a sua família profissional, ela aparecerá aqui." />
            )}
          </Card>

          <section aria-labelledby="oportunidades-internas">
            <SectionHeader title="Oportunidades internas" id="oportunidades-internas" href="/carreira/oportunidades" linkLabel="Ver todas" className="mb-3" />
            {o.opportunities.length === 0 ? (
              <EmptyState icon={UsersRound} title="Nenhuma oportunidade aberta para você agora" description="Fique de olho: novas vagas internas aparecem aqui assim que forem publicadas." />
            ) : (
              <ul className="grid grid-cols-1 gap-3 min-[1440px]:grid-cols-2">
                {o.opportunities.map((op) => (
                  <li key={op.id}>
                    <OpportunityCard o={op} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="conteudos">
            <SectionHeader title="Conteúdos recomendados" id="conteudos" href="/cursos" className="mb-3" />
            {o.recommended.length === 0 ? (
              <p className="text-[0.9375rem] text-muted">Sem recomendações no momento.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1440px]:grid-cols-3">
                {o.recommended.map((c, i) => (
                  <li key={c.id} className={cn(i > 0 && "hidden sm:block")}>
                    <CourseCard c={c} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Celular: chamada final da referência mobile (o card inteiro é o link). */}
          <Link href="/carreira/oportunidades" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-brand-50 p-4 hover:bg-brand-100/70 xl:hidden">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100/80 text-brand-600" aria-hidden>
              <Star className="size-7" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-ink">Construa o seu futuro com a gente</span>
              <span className="block text-[0.9375rem] leading-snug text-muted">A REALSEG investe no seu desenvolvimento e oferece oportunidades para você crescer.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink" aria-hidden />
          </Link>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="p-5" aria-labelledby="proximas-etapas">
            <h2 id="proximas-etapas" className="text-lg font-bold text-ink">
              Próximas etapas
            </h2>
            {o.goals.filter((g) => g.status !== "concluida").length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-muted">Nenhuma etapa pendente no seu plano de desenvolvimento.</p>
            ) : (
              <ol className="mt-3 flex flex-col">
                {o.goals
                  .filter((g) => g.status !== "concluida" || g.courseCompleted)
                  .slice(0, 4)
                  .map((g, i, arr) => {
                    const done = g.status === "concluida" || g.courseCompleted;
                    // A primeira etapa não concluída é a "atual" (anel com ponto, como na referência).
                    const current = !done && arr.findIndex((x) => !(x.status === "concluida" || x.courseCompleted)) === i;
                    return (
                      <li key={g.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {i < arr.length - 1 && <span className="absolute top-8 left-[0.9375rem] h-[calc(100%-2rem)] w-px bg-line" aria-hidden />}
                        {done ? (
                          <CircleCheck className="size-8 shrink-0 fill-brand-600 text-white" aria-label="Concluída" />
                        ) : current || g.status === "em_andamento" ? (
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-[3px] border-brand-500" role="img" aria-label={g.status === "em_andamento" ? "Em andamento" : "Próxima etapa"}>
                            <span className="size-2.5 rounded-full bg-brand-500" />
                          </span>
                        ) : (
                          <Circle className="size-8 shrink-0 text-subtle" aria-label="Pendente" />
                        )}
                        <div className="pt-1">
                          {g.courseSlug ? (
                            <Link href={`/cursos/${g.courseSlug}`} className="font-semibold text-ink hover:underline">
                              {g.title}
                            </Link>
                          ) : (
                            <p className="font-semibold text-ink">{g.title}</p>
                          )}
                          <p className="text-sm text-muted">
                            {g.dueDate ? `Até ${fmtDateLong(dateOf(g.dueDate))}` : g.startsOn ? `A partir de ${fmtMonthYear(dateOf(g.startsOn))}` : "Sem prazo definido"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
              </ol>
            )}
          </Card>
          <Card className="p-5" aria-labelledby="conquistas">
            <SectionHeader title="Minhas conquistas" id="conquistas" href="/carreira/desenvolvimento#conquistas" linkLabel="Ver todas" as="h2" className="[&_h2]:text-lg" />
            {o.achievements.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-muted">Conclua cursos para ganhar suas primeiras conquistas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {o.achievements.map((a) => {
                  const Icon = iconFor(a.icon);
                  const tone = toTone(a.color);
                  return (
                    <li key={a.id} className="flex gap-3 py-3">
                      <span className={cn("inline-flex size-14 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                        <Icon className="size-7" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{a.title}</p>
                        {a.description && <p className="text-sm text-muted">{a.description}</p>}
                        <p className="text-sm text-muted">{fmtDateLong(a.awardedAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <div className="hidden items-center gap-4 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-5 xl:flex">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600" aria-hidden>
          <UsersRound className="size-7" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-bold text-ink">Construa o seu futuro com a gente</p>
          <p className="text-[0.9375rem] text-muted">A REALSEG investe no seu desenvolvimento e oferece oportunidades para você crescer.</p>
        </div>
        <ButtonLink href="/carreira/oportunidades" iconRight={<ArrowRight className="size-5" aria-hidden />}>
          Ver oportunidades
        </ButtonLink>
      </div>
    </div>
  );
}
