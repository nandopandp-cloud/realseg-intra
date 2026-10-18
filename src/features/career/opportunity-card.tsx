import Link from "next/link";
import { Building2, ChevronRight, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";

export type Opp = { id: string; title: string; areaLabel: string; location: string | null; isNew: boolean; isHighlighted: boolean; applicationStatus: string | null };

export function OpportunityCard({ o }: { o: Opp }) {
  const Icon = o.areaLabel === "Segurança" ? ShieldCheck : o.areaLabel === "Operacional" ? Truck : Building2;
  return (
    <Link href={`/carreira/oportunidades/${o.id}`} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line p-3.5 hover:bg-canvas">
      <span className={`inline-flex size-16 shrink-0 items-center justify-center rounded-xl ${o.isHighlighted ? "bg-blue-50 text-brand-600" : "bg-brand-50 text-brand-600"}`} aria-hidden>
        <Icon className="size-8" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink">{o.title}</span>
          {o.isNew && <Badge tone="green">Nova</Badge>}
          {o.isHighlighted && <Badge tone="blue">Em destaque</Badge>}
          {o.applicationStatus && o.applicationStatus !== "retirada" && <Badge tone="teal">Candidatura enviada</Badge>}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4" aria-hidden /> {o.areaLabel}
          </span>
          {o.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {o.location}
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
    </Link>
  );
}
