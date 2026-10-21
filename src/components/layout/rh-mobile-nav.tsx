"use client";

import Link from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { RH_NAV } from "./rh-nav";

/** Celular/tablet: menu do ambiente de gestão em faixa rolável abaixo do cabeçalho (a gestão é usada sobretudo no desktop). */
export function RhMobileNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  const items = RH_NAV.flatMap((g) => g.items).filter((i) => allowed.includes(i.href));
  return (
    <nav aria-label="Seções da gestão" className="sticky top-[4.5rem] z-20 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {items.map((item) => {
          const active = item.match?.(pathname) ?? false;
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap",
                  active ? "bg-brand-700 text-white" : "text-ink hover:bg-canvas",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
