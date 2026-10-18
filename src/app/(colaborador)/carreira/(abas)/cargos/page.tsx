import type { Metadata } from "next";
import { Info, MapPin } from "lucide-react";
import { Alert, Badge, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { careerPlan } from "@/server/services/career";

export const metadata: Metadata = { title: "Cargos e salários" };

export default async function CareerPlanPage() {
  const ctx = await requireCtx();
  const plan = await careerPlan(ctx);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-ink">Plano de cargos e salários — {plan.family.name}</h2>
        <p className="text-[0.9375rem] text-muted">{plan.family.description}</p>
      </div>
      <Alert kind="info" title="Como ler esta página">
        As faixas mostram o intervalo salarial <strong>publicado</strong> para cada cargo, vigente hoje. Elas não indicam o seu salário individual nem garantem promoção — a evolução depende dos critérios de cada nível e das regras do plano.
      </Alert>
      <ol className="flex flex-col gap-3">
        {plan.positions.map((p) => (
          <li key={p.id}>
            <Card className={cn("p-5", p.isCurrent && "border-brand-200 bg-brand-50")} as="div">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Nível {p.levelLabel}</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">
                    {p.title} {p.levelLabel.length <= 3 ? p.levelLabel : ""}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.isCurrent && (
                    <Badge tone="teal">
                      <MapPin className="size-3.5" aria-hidden /> Seu cargo atual
                    </Badge>
                  )}
                  {p.band ? (
                    <span className="rounded-lg bg-surface px-3 py-1.5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line">
                      {fmtCurrency(p.band.minCents)} – {fmtCurrency(p.band.maxCents)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                      <Info className="size-4" aria-hidden /> Faixa não divulgada
                    </span>
                  )}
                </div>
              </div>
              {p.description && <p className="mt-2 text-[0.9375rem] text-muted">{p.description}</p>}
              <dl className="mt-3 grid grid-cols-1 gap-3 text-[0.9375rem] md:grid-cols-2">
                {p.requirements && (
                  <div>
                    <dt className="font-semibold text-ink">Requisitos</dt>
                    <dd className="text-muted">{p.requirements}</dd>
                  </div>
                )}
                {p.progressionCriteria && (
                  <div>
                    <dt className="font-semibold text-ink">Critérios de evolução</dt>
                    <dd className="text-muted">{p.progressionCriteria}</dd>
                  </div>
                )}
              </dl>
              {p.band && <p className="mt-3 text-xs text-muted">Faixa vigente desde {fmtDate(p.band.effectiveFrom + "T12:00:00Z")}.</p>}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
