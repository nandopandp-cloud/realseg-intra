"use client";

import Link from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { Briefcase, ChartColumn, CircleCheck, Route, Star, Wallet } from "lucide-react";
import { LinkTabs } from "@/components/ui/navigation";
import { cn } from "@/lib/cn";

/** Abas da referência (Visão geral · Meu desenvolvimento · Oportunidades · Avaliações). Cargos e salários fica dentro de "Meu desenvolvimento". */
const TABS = [
  { href: "/carreira", label: "Visão geral", icon: CircleCheck, match: (p: string) => p === "/carreira" },
  { href: "/carreira/desenvolvimento", label: "Meu desenvolvimento", icon: ChartColumn, match: (p: string) => p === "/carreira/desenvolvimento" || p === "/carreira/cargos" },
  { href: "/carreira/oportunidades", label: "Oportunidades", icon: Briefcase, match: (p: string) => p.startsWith("/carreira/oportunidades") },
  { href: "/carreira/avaliacoes", label: "Avaliações", icon: Star, match: (p: string) => p.startsWith("/carreira/avaliacoes") },
];

export function CareerTabs() {
  const pathname = usePathname();
  return (
    <LinkTabs
      label="Seções de carreira"
      className="relative z-10 rounded-t-xl bg-surface lg:inline-block lg:px-2"
      items={TABS.map((t) => {
        const Icon = t.icon;
        return { href: t.href, label: t.label, active: t.match(pathname), icon: <Icon className="size-5" aria-hidden /> };
      })}
    />
  );
}

const SUB = [
  { href: "/carreira/desenvolvimento", label: "Plano e trilhas", icon: Route },
  { href: "/carreira/cargos", label: "Cargos e salários", icon: Wallet },
];

/** Sub-navegação de "Meu desenvolvimento": plano/trilhas e o plano de cargos e salários. */
export function DevelopmentSubnav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Meu desenvolvimento" className="mb-5">
      <ul className="inline-flex gap-1 rounded-xl bg-field p-1">
        {SUB.map((s) => {
          const active = pathname === s.href;
          const Icon = s.icon;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-[0.9375rem] font-medium whitespace-nowrap", active ? "bg-surface text-brand-700 shadow-[var(--shadow-card)]" : "text-muted hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden /> {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
