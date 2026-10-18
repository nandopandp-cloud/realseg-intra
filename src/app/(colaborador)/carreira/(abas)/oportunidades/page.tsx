import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/ui/primitives";
import { OpportunityCard } from "@/features/career/opportunity-card";
import { requireCtx } from "@/server/auth/current";
import { listOpportunities } from "@/server/services/career";

export const metadata: Metadata = { title: "Oportunidades internas" };

export default async function OpportunitiesPage() {
  const ctx = await requireCtx();
  const items = await listOpportunities(ctx);
  return (
    <section aria-labelledby="opps">
      <h2 id="opps" className="text-xl font-bold text-ink">
        Oportunidades internas
      </h2>
      <p className="text-[0.9375rem] text-muted">Vagas publicadas para as quais você é elegível.</p>
      {items.length === 0 ? (
        <EmptyState className="mt-5" icon={Briefcase} title="Nenhuma oportunidade aberta para você agora" description="Novas vagas internas aparecem aqui assim que forem publicadas pelo RH." />
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((o) => (
            <li key={o.id}>
              <OpportunityCard o={o} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
