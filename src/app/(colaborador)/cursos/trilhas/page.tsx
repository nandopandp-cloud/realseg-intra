import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowLeft, ChevronRight, Route } from "lucide-react";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Breadcrumbs, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtMinutes } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listLearningPaths } from "@/server/services/courses";

export const metadata: Metadata = { title: "Trilhas de aprendizagem" };

/** Todas as trilhas de aprendizagem disponíveis para o colaborador, com o progresso de cada uma. */
export default async function LearningPathsPage() {
  const ctx = await requireCtx();
  const paths = await listLearningPaths(ctx);
  return (
    <div className="px-4 pt-5 pb-2 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Cursos", href: "/cursos" }, { label: "Trilhas de aprendizagem" }]} />
      <Link href="/cursos" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Cursos
      </Link>
      <p className="eyebrow mt-2 lg:mt-6">Desenvolvimento</p>
      <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-ink sm:text-[2.5rem]">Trilhas de aprendizagem</h1>
      <p className="mt-1 text-[1.0625rem] text-muted">Sequências de cursos para desenvolver cada área. Seu progresso é salvo automaticamente.</p>
      {paths.length === 0 ? (
        <EmptyState className="mt-6" icon={Route} title="Nenhuma trilha disponível" description="Quando houver trilhas para o seu cargo ou área, elas aparecerão aqui." />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {paths.map((p) => {
            const Icon = iconFor(p.icon);
            const tone = toTone(p.color);
            return (
              <li key={p.id}>
                <Link href={`/cursos/trilhas/${p.slug}`} className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-raised)]">
                  <span className="flex items-start justify-between gap-3">
                    <span className={cn("inline-flex size-14 shrink-0 items-center justify-center rounded-2xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                      <Icon className="size-7" />
                    </span>
                    {p.percent === 100 ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Concluída</span>
                    ) : p.percent > 0 ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Em andamento</span>
                    ) : null}
                  </span>
                  <span className="mt-4 text-lg font-bold text-ink">{p.title}</span>
                  {p.description && <span className="mt-1 flex-1 text-[0.9375rem] text-muted">{p.description}</span>}
                  <span className="mt-3 text-sm text-muted">
                    {p.courseCount} {p.courseCount === 1 ? "curso" : "cursos"} • {fmtMinutes(p.minutes)}
                  </span>
                  <span className="mt-2 flex items-center gap-3">
                    <ProgressBar value={p.percent} label={`${p.title}: ${p.percent}% concluído`} />
                    <span className="text-sm whitespace-nowrap text-muted">{p.percent}%</span>
                    <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
