import { ProgressBar } from "@/components/ui/primitives";
import type { SlaView } from "@/server/sla/ticket-sla";

/** Prazo compreensível: "2 de 3 dias úteis" + barra + situação em texto (não só cor). */
export function SlaMeter({ sla, compact }: { sla: SlaView; compact?: boolean }) {
  if (sla.kind === "none") return <span className="text-sm text-muted">{compact ? "—" : "Sem prazo definido"}</span>;
  const tone = sla.kind === "overdue" || sla.kind === "breached" ? "red" : sla.percent >= 80 && sla.kind === "running" ? "amber" : "brand";
  return (
    <div className={compact ? "min-w-0" : "min-w-[7.5rem]"}>
      <p className="text-sm text-ink">{sla.progressLabel}</p>
      <ProgressBar value={sla.kind === "met" ? 100 : sla.percent} label={`Prazo: ${sla.progressLabel}. ${sla.statusLabel}`} tone={tone} className="mt-1 h-1.5" />
      {!compact && <p className={`mt-1 text-sm ${tone === "red" ? "font-semibold text-red-700" : "text-muted"}`}>{sla.statusLabel}</p>}
    </div>
  );
}
