import Link from "@/components/ui/app-link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight, CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { TONE, type Tone } from "./icons";

export function Card({ className, children, as: As = "section", ...rest }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "li" } & Record<string, unknown>) {
  return (
    <As className={cn("rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </As>
  );
}

/** Cabeçalho de seção com link "Ver todos →" (padrão das referências). */
export function SectionHeader({
  title,
  href,
  linkLabel = "Ver todos",
  as: As = "h2",
  className,
  id,
  action,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  as?: "h2" | "h3";
  className?: string;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <As id={id} className="min-w-0 text-lg font-bold tracking-tight text-ink sm:text-xl">
        {title}
      </As>
      {action}
      {href && (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[0.9375rem] font-medium whitespace-nowrap text-brand-600 hover:text-brand-700">
          {linkLabel}
          <span className="sr-only"> — {title}</span>
          <ArrowRight className="size-[1.125rem]" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function IconTile({ icon: Icon, tone = "teal", size = "md", className }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "size-10 rounded-[10px] [&_svg]:size-5", md: "size-12 rounded-xl [&_svg]:size-6", lg: "size-16 rounded-2xl [&_svg]:size-8" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", TONE[tone].tile, TONE[tone].icon, s, className)} aria-hidden>
      <Icon strokeWidth={1.75} />
    </span>
  );
}

/** Badge sempre com texto (status nunca só por cor). */
export function Badge({ tone = "slate", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", TONE[tone].soft, TONE[tone].text, className)}>
      {dot && <span className={cn("size-1.5 rounded-full", TONE[tone].dot)} aria-hidden />}
      {children}
    </span>
  );
}

/** Rótulo de categoria mono com ponto colorido ("● IMPORTANTE"). */
export function CategoryLabel({ tone = "teal", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.14em] uppercase", tone === "teal" ? "text-brand-700" : "text-slate-700")}>
      <span className={cn("size-2 rounded-full", TONE[tone].dot)} aria-hidden />
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function ProgressBar({ value, label, className, tone = "brand" }: { value: number; label: string; className?: string; tone?: "brand" | "amber" | "red" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <div
        className={cn("h-full rounded-full", tone === "brand" ? "bg-brand-600" : tone === "amber" ? "bg-amber-600" : "bg-red-700")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Anel de progresso. Escala pelo viewBox: `className` pode reduzir o tamanho em telas menores (ex.: `max-sm:!size-26`). */
export function ProgressRing({ value, size = 128, stroke = 12, caption = "Concluído", className }: { value: number; size?: number; stroke?: number; caption?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${v}% ${caption.toLowerCase()}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-brand-600)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <span className="absolute flex flex-col items-center" aria-hidden>
        <span className="text-[1.75rem] leading-none font-bold text-ink">{v}%</span>
        <span className="mt-1 text-xs text-muted">{caption}</span>
      </span>
    </div>
  );
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "size-9 text-sm", md: "size-12 text-base", lg: "size-16 text-xl" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-navy-900 font-bold text-white ring-2 ring-brand-100", s, className)} aria-hidden>
      {initials(name)}
    </span>
  );
}

const ALERT = {
  info: { icon: Info, cls: "border-blue-100 bg-blue-50 text-blue-700" },
  success: { icon: CircleCheck, cls: "border-brand-200 bg-brand-50 text-brand-700" },
  warning: { icon: TriangleAlert, cls: "border-amber-100 bg-amber-50 text-amber-700" },
  error: { icon: CircleAlert, cls: "border-red-100 bg-red-50 text-red-700" },
};

export function Alert({ kind = "info", title, children, className }: { kind?: keyof typeof ALERT; title?: string; children?: ReactNode; className?: string }) {
  const { icon: Icon, cls } = ALERT[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-[0.9375rem]", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ink/80")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-10 text-center", className)}>
      <IconTile icon={Icon} tone="teal" size="lg" />
      <p className="mt-4 text-base font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-[0.9375rem] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-field", className)} aria-hidden />;
}

/** Linha clicável de lista (link com chevron), base de várias listas das referências. */
export function RowLink({ href, children, className, ariaLabel }: { href: string; children: ReactNode; className?: string; ariaLabel?: string }) {
  return (
    <Link href={href} aria-label={ariaLabel} className={cn("group flex items-center gap-4 rounded-[var(--radius-card)] transition-colors hover:bg-canvas", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="size-5 shrink-0 text-ink/70 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden lg:block">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-4 text-muted" aria-hidden />}
            {it.href ? (
              <Link href={it.href} className="font-medium text-brand-600 hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-brand-700">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DemoBanner() {
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-700" role="note">
      Ambiente de demonstração — dados fictícios, sem validade.
    </div>
  );
}
