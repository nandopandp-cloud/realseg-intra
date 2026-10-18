"use client";

import { BrandLogo } from "@/components/ui/brand-logo";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex min-h-[3.25rem] items-center gap-3.5 rounded-xl px-4 text-[1rem] transition-colors",
        active ? "bg-navy-900 font-semibold text-brand-400" : "text-on-dark hover:bg-navy-900/60 hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-full bg-brand-400" aria-hidden />}
      <Icon className="size-[1.375rem] shrink-0" strokeWidth={1.75} aria-hidden />
      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ initialCollapsed }: { initialCollapsed: boolean }) {
  const pathname = usePathname();
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
        <Link href="/" aria-label="REALSEG — página inicial" className="rounded-lg">
          {collapsed ? (
            <BrandLogo variant="dark" size="sm" symbolOnly />
          ) : (
            <BrandLogo variant="dark" size="md" />
          )}
        </Link>
      </div>

      <nav aria-label="Seções" className={cn("flex-1 overflow-y-auto", collapsed ? "px-3" : "px-5")}>
        <ul className="flex flex-col gap-1.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={item.match?.(pathname) ?? false} collapsed={collapsed} />
            </li>
          ))}
        </ul>
        <hr className="my-5 border-navy-800" />
        <ul className="flex flex-col gap-1.5">
          {SECONDARY_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={item.match?.(pathname) ?? false} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="px-6 pb-4">
          <Image src="/images/sidebar-promo.jpg" alt="Segurança que enxerga além." width={230} height={254} className="h-auto w-full rounded-2xl" />
        </div>
      )}
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
