import Link from "@/components/ui/app-link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { IconTile } from "@/components/ui/primitives";
import type { Tone } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Indicador do painel: número grande, rótulo e contexto em texto (nunca só cor). Clicável quando leva à lista. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "teal",
  href,
  alert,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        {href && <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      <p className={cn("mt-4 text-[2rem] leading-none font-bold tracking-tight tabular-nums", alert ? "text-red-700" : "text-ink")}>{value}</p>
      <p className="mt-1.5 text-[0.9375rem] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </>
  );
  const cls = "group block h-full rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]";
  return href ? (
    <Link href={href} className={cn(cls, "transition-shadow hover:shadow-[var(--shadow-raised)]")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
