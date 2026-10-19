import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Briefcase, ChevronRight, Info } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import type { Tone } from "@/components/ui/icons";
import { OpportunityCard } from "@/features/career/opportunity-card";
import { fmtDateLong } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listOpportunities, myApplications } from "@/server/services/career";

export const metadata: Metadata = { title: "Oportunidades internas" };

const STATUS: Record<string, { tone: Tone; label: string }> = {
  enviada: { tone: "teal", label: "Enviada" },
  em_analise: { tone: "amber", label: "Em análise" },
  encerrada: { tone: "slate", label: "Encerrada" },
  retirada: { tone: "slate", label: "Retirada" },
};

export default async function OpportunitiesPage() {
  const ctx = await requireCtx();
  const [items, applications] = await Promise.all([listOpportunities(ctx), myApplications(ctx)]);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="opps" className="min-w-0">
        <h2 id="opps" className="text-xl font-bold text-ink">
          Oportunidades internas
        </h2>
        <p className="text-[0.9375rem] text-muted">Vagas publicadas para as quais você é elegível.</p>
        {items.length === 0 ? (
          <EmptyState className="mt-5" icon={Briefcase} title="Nenhuma oportunidade aberta para você agora" description="Novas vagas internas aparecem aqui assim que forem publicadas pelo RH." />
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 min-[1440px]:grid-cols-2">
            {items.map((o) => (
              <li key={o.id}>
                <OpportunityCard o={o} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-4" aria-label="Minhas candidaturas e como funciona">
        <Card className="p-5" aria-labelledby="candidaturas">
          <h2 id="candidaturas" className="text-lg font-bold text-ink">
            Minhas candidaturas
          </h2>
          {applications.length === 0 ? (
            <p className="mt-2 text-[0.9375rem] text-muted">Você ainda não se candidatou. Abra uma vaga e toque em “Quero me candidatar”.</p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {applications.map((a) => (
                <li key={a.opportunityId}>
                  <Link href={`/carreira/oportunidades/${a.opportunityId}`} className="flex min-h-14 items-center gap-3 py-3 hover:bg-canvas">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{a.title}</span>
                      <span className="block text-sm text-muted">
                        {a.status === "retirada" ? "Retirada" : "Enviada"} em {fmtDateLong(a.appliedAt)}
                        {!a.open && " • vaga encerrada"}
                      </span>
                    </span>
                    <Badge tone={STATUS[a.status]?.tone ?? "slate"}>{STATUS[a.status]?.label ?? a.status}</Badge>
                    <ChevronRight className="size-4 shrink-0 text-ink/60" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex gap-3 border-blue-100 bg-blue-50 p-5">
          <Info className="size-5 shrink-0 text-blue-600" aria-hidden />
          <div className="text-[0.9375rem] text-muted">
            <p className="font-semibold text-ink">Como funciona</p>
            <p className="mt-1">Sua candidatura vai para o RH, e seu gestor também pode vê-la. Você pode retirá-la enquanto estiver como “Enviada”. O RH entra em contato para as próximas etapas.</p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
