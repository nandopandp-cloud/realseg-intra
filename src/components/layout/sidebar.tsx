"use client";

import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";
import { RH_NAV } from "./rh-nav";

function NavLink({ item, active, collapsed, dense }: { item: NavItem; active: boolean; collapsed: boolean; dense?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3.5 rounded-xl px-4 transition-colors",
        dense ? "min-h-11 text-[0.9375rem]" : "min-h-[3.25rem] text-[1rem]",
        active ? "bg-navy-900 font-semibold text-brand-400" : "text-on-dark hover:bg-navy-900/60 hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-full bg-brand-400" aria-hidden />}
      <Icon className={cn("shrink-0", dense ? "size-5" : "size-[1.375rem]")} strokeWidth={1.75} aria-hidden />
      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );
}

type Group = { label?: string; items: NavItem[] };

/**
 * `colaborador`: menu do colaborador. `rh`: ambiente de gestão, com grupos e apenas os itens permitidos
 * (`allowed` vem do servidor — o cliente não decide permissões).
 */
export function Sidebar({ initialCollapsed, variant = "colaborador", allowed = [] }: { initialCollapsed: boolean; variant?: "colaborador" | "rh"; allowed?: string[] }) {
  const pathname = usePathname();
  const groups: Group[] =
    variant === "rh"
      ? RH_NAV.map((g) => ({ label: g.label, items: g.items.filter((i) => allowed.includes(i.href)) })).filter((g) => g.items.length > 0)
      : [{ items: PRIMARY_NAV }, { items: SECONDARY_NAV }];
  const home = variant === "rh" ? "/rh" : "/";
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  async function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Preferência persistida; falha não bloqueia a navegação.
    fetch("/api/v1/me/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sidebarCollapsed: next }) }).catch(() => {});
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-navy-950 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[var(--spacing-sidebar-collapsed)]" : "w-[var(--spacing-sidebar)]",
      )}
      aria-label="Menu principal"
    >
      <div className={cn("flex items-center pt-6 pb-8", collapsed ? "justify-center px-2" : "px-8")}>
        <Link href={home} aria-label={variant === "rh" ? "REALSEG — painel de gestão" : "REALSEG — página inicial"} className="rounded-lg">
          {collapsed ? (
            <BrandLogo variant="dark" size="sm" symbolOnly />
          ) : (
            <BrandLogo variant="dark" size="md" />
          )}
        </Link>
      </div>
      {variant === "rh" && !collapsed && (
        <p className="-mt-5 mb-5 px-8 font-mono text-[0.6875rem] font-medium tracking-[0.22em] text-brand-400 uppercase">Gestão · RH</p>
      )}

      <nav aria-label="Seções" className={cn("flex-1 overflow-y-auto", collapsed ? "px-3" : "px-5")}>
        {groups.map((g, i) => (
          <div key={g.label ?? i}>
            {i > 0 && (g.label ? null : <hr className="my-5 border-navy-800" />)}
            {g.label &&
              (collapsed ? (
                i > 0 && <hr className="my-3 border-navy-800" />
              ) : (
                <p className={cn("px-4 pb-1.5 font-mono text-[0.6875rem] tracking-[0.18em] text-on-dark-muted uppercase", i > 0 && "mt-5")}>{g.label}</p>
              ))}
            <ul className={cn("flex flex-col", variant === "rh" ? "gap-0.5" : "gap-1.5")}>
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={item.match?.(pathname) ?? false} collapsed={collapsed} dense={variant === "rh"} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("pb-5", collapsed ? "flex justify-center" : "px-6")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-on-dark-muted hover:bg-navy-900 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
          <span className={cn(collapsed && "sr-only")}>{collapsed ? "Expandir menu" : "Recolher menu"}</span>
        </button>
      </div>
    </aside>
  );
}
