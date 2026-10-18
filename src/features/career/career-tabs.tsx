"use client";

import { usePathname } from "next/navigation";
import { Briefcase, ChartColumn, CircleCheck, Star, Wallet } from "lucide-react";
import { LinkTabs } from "@/components/ui/navigation";

const TABS = [
  { href: "/carreira", label: "Visão geral", icon: CircleCheck },
  { href: "/carreira/desenvolvimento", label: "Meu desenvolvimento", icon: ChartColumn },
  { href: "/carreira/cargos", label: "Cargos e salários", icon: Wallet },
  { href: "/carreira/oportunidades", label: "Oportunidades", icon: Briefcase },
  { href: "/carreira/avaliacoes", label: "Avaliações", icon: Star },
];

export function CareerTabs() {
  const pathname = usePathname();
  return (
    <LinkTabs
      label="Seções de carreira"
      className="relative z-10 rounded-t-xl bg-surface lg:inline-block lg:px-2"
      items={TABS.map((t) => {
        const Icon = t.icon;
        return { href: t.href, label: t.label, active: pathname === t.href, icon: <Icon className="size-5" aria-hidden /> };
      })}
    />
  );
}
