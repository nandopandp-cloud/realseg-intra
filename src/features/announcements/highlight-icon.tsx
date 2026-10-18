import { createElement, type ComponentType } from "react";
import { CalendarDays, CircleCheck, Clock, IdCard, ShieldCheck, Shirt, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/** Bota de segurança no mesmo traço dos ícones Lucide (o Lucide não tem uma). */
function BootIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 3h6v8.5l6.2 2.1A3 3 0 0 1 20.3 16.4V18H4V3h2z" />
      <path d="M4 21h16.3M4 18v3M20.3 18v3M12 11.5H8M12 8H8" />
    </svg>
  );
}

const ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  shirt: Shirt,
  badge: IdCard,
  boot: BootIcon,
  shield: ShieldCheck,
  clock: Clock,
  calendar: CalendarDays,
  alert: TriangleAlert,
  check: CircleCheck,
};

/** Tons em sequência, como na referência (verde, azul, laranja). */
const TONES = ["bg-brand-100 text-brand-600", "bg-blue-100 text-blue-600", "bg-amber-100 text-amber-600"];

export function HighlightIcon({ name, index }: { name: string; index: number }) {
  return (
    <span className={cn("inline-flex size-12 items-center justify-center rounded-xl", TONES[index % TONES.length])} aria-hidden>
      {createElement(ICONS[name] ?? CircleCheck, { className: "size-6", strokeWidth: 1.9 })}
    </span>
  );
}
