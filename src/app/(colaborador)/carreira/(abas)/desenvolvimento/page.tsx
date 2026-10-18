import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Award, CircleCheck, Circle, GraduationCap } from "lucide-react";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateLong, fmtMinutes } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { myAchievements, myGoals, myTrack } from "@/server/services/career";
import { listLearningPaths, trainingHistory } from "@/server/services/courses";

export const metadata: Metadata = { title: "Meu desenvolvimento" };

const GOAL_STATUS = { pendente: { tone: "slate", label: "Pendente" }, em_andamento: { tone: "amber", label: "Em andamento" }, concluida: { tone: "green", label: "Concluída" } } as const;

export default async function DevelopmentPage() {
  const ctx = await requireCtx();
  const [track, goals, history, achievements, paths] = await Promise.all([myTrack(ctx), myGoals(ctx), trainingHistory(ctx), myAchievements(ctx, 50), listLearningPaths(ctx)]);
  const totalMinutes = history.reduce((a, h) => a + h.durationMinutes, 0);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="p-5" aria-labelledby="plano">
        <h2 id="plano" className="text-lg font-bold text-ink">
          Plano de desenvolvimento
        </h2>
        <p className="text-[0.9375rem] text-muted">Etapas combinadas com a sua liderança e o RH.</p>
        {goals.length === 0 ? (
          <EmptyState className="mt-4" icon={CircleCheck} title="Nenhuma etapa definida" description="Converse com sua liderança sobre o seu plano de desenvolvimento." />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {goals.map((g) => {
              const status = g.courseCompleted && g.status !== "concluida" ? GOAL_STATUS.concluida : GOAL_STATUS[g.status];
              return (
                <li key={g.id} className="flex items-start gap-3 py-3">
                  {status === GOAL_STATUS.concluida ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-subtle" aria-hidden />}
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{g.courseSlug ? <Link href={`/cursos/${g.courseSlug}`} className="hover:underline">{g.title}</Link> : g.title}</p>
                    <p className="text-sm text-muted">{g.dueDate ? `Prazo: ${fmtDate(g.dueDate + "T12:00:00Z")}` : g.startsOn ? `Início: ${fmtDate(g.startsOn + "T12:00:00Z")}` : "Sem prazo"}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5" aria-labelledby="trilhas-carreira">
        <h2 id="trilhas-carreira" className="text-lg font-bold text-ink">
          Trilhas
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {paths.map((p) => {
            const Icon = iconFor(p.icon);
            const tone = toTone(p.color);
            return (
              <li key={p.id}>
                <Link href={`/cursos/trilhas/${p.slug}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-canvas">
                  <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      {p.title} {track?.id === p.id && <Badge tone="teal">Sua trilha</Badge>}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <ProgressBar value={p.percent} label={`${p.title}: ${p.percent}%`} className="h-1.5" />
                      <span className="text-xs whitespace-nowrap text-muted">
                        {p.completed}/{p.courseCount}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5" aria-labelledby="historico-capacitacao">
        <h2 id="historico-capacitacao" className="text-lg font-bold text-ink">
          Histórico de capacitação
        </h2>
        <p className="text-[0.9375rem] text-muted">
          {history.length} cursos concluídos • {fmtMinutes(totalMinutes)} de capacitação
        </p>
        {history.length === 0 ? (
          <EmptyState className="mt-4" icon={GraduationCap} title="Nenhum curso concluído ainda" description="Os cursos que você concluir aparecem aqui." />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {history.map((h) => (
              <li key={h.courseSlug} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/cursos/${h.courseSlug}`} className="font-semibold text-ink hover:underline">
                  {h.courseTitle}
                </Link>
                <span className="text-sm whitespace-nowrap text-muted">{h.completedAt ? fmtDate(h.completedAt) : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5" aria-labelledby="conquistas" id="conquistas">
        <h2 className="text-lg font-bold text-ink" id="conquistas-titulo">
          Conquistas
        </h2>
        {achievements.length === 0 ? (
          <EmptyState className="mt-4" icon={Award} title="Nenhuma conquista ainda" description="Conclua cursos e etapas para conquistar reconhecimentos." />
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {achievements.map((a) => {
              const Icon = iconFor(a.icon);
              const tone = toTone(a.color);
              return (
                <li key={a.id} className="flex gap-3 rounded-xl border border-line p-3">
                  <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{a.title}</p>
                    {a.description && <p className="text-sm text-muted">{a.description}</p>}
                    <p className="text-xs text-muted">{fmtDateLong(a.awardedAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
