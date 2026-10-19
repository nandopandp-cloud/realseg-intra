import Link from "@/components/ui/app-link";
import { Building2, ChevronRight, FileText, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export type Opp = { id: string; title: string; areaLabel: string; location: string | null; isNew: boolean; isHighlighted: boolean; applicationStatus: string | null };

/** Oportunidade interna — ícone da área, título e local; selos (Nova, Em destaque, candidatura) à direita, como na referência. */
export function OpportunityCard({ o }: { o: Opp }) {
  const Icon = o.areaLabel === "Segurança" ? ShieldCheck : o.areaLabel === "Operacional" ? Truck : Building2;
  const applied = !!o.applicationStatus && o.applicationStatus !== "retirada";
  return (
    <Link href={`/carreira/oportunidades/${o.id}`} className="flex h-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 hover:bg-canvas sm:gap-4 sm:p-3.5">
      <span className={cn("inline-flex size-14 shrink-0 items-center justify-center rounded-xl", o.isHighlighted ? "bg-blue-50 text-brand-600" : "bg-brand-50 text-brand-600")} aria-hidden>
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] leading-snug font-bold text-ink sm:text-base">{o.title}</span>
        <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-4" aria-hidden /> {o.areaLabel}
          </span>
          {o.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {o.location}
            </span>
          )}
        </span>
      </span>
      {(o.isNew || o.isHighlighted || applied) && (
        <span className="flex shrink-0 flex-col items-end gap-1">
          {applied ? <Badge tone="teal">Candidatura enviada</Badge> : o.isNew ? <Badge tone="green">Nova</Badge> : null}
          {o.isHighlighted && !applied && <Badge tone="blue">Em destaque</Badge>}
        </span>
      )}
      <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
    </Link>
  );
}
