"use client";

import Link from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChartColumn, CircleHelp, GraduationCap, Megaphone, Menu, Search, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { HouseSolid } from "@/components/ui/solid-icons";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { FEATURES } from "@/lib/features";
import { MOBILE_NAV } from "./nav-items";

const MORE: Array<{ href: string; label: string; icon: LucideIcon; description: string }> = [
  { href: "/busca", label: "Buscar", icon: Search, description: "Pesquisar em toda a intranet" },
  { href: "/comunicados", label: "Comunicados", icon: Megaphone, description: "Avisos e novidades da empresa" },
  { href: "/cursos", label: "Cursos", icon: GraduationCap, description: "Aulas, progresso e certificados" },
  { href: "/carreira", label: "Minha carreira", icon: ChartColumn, description: "Desenvolvimento, cargos e oportunidades" },
  { href: "/ajuda", label: "Ajuda e suporte", icon: CircleHelp, description: "Dúvidas frequentes e tutoriais" },
  ...(FEATURES.talkToHr ? [{ href: "/fale-com-rh", label: "Fale com o RH", icon: UsersRound, description: "Envie uma mensagem ao RH" }] : []),
  { href: "/notificacoes", label: "Notificações", icon: Bell, description: "Avisos e atualizações" },
  { href: "/perfil", label: "Meu perfil", icon: UserRound, description: "Dados, preferências e senha" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inMore = MORE.some((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));

  const itemCls = (active: boolean) =>
    cn("relative flex min-h-[4.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[0.8125rem] leading-tight font-medium tracking-[-0.01em]", active ? "text-brand-600 font-semibold" : "text-muted");

  return (
    <>
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-xl">
          {MOBILE_NAV.map((item) => {
            const active = item.match?.(pathname) ?? false;
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={itemCls(active)}>
                  {active && item.href === "/" ? <HouseSolid className="size-7" /> : <Icon className="size-7" strokeWidth={1.6} aria-hidden />}
                  {item.label}
                  {active && <span className="absolute bottom-1 h-[3px] w-8 rounded-full bg-brand-600" aria-hidden />}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" className={itemCls(inMore)}>
              <Menu className="size-7" strokeWidth={inMore ? 2.25 : 1.6} aria-hidden />
              Mais
              {inMore && <span className="absolute bottom-1 h-[3px] w-8 rounded-full bg-brand-600" aria-hidden />}
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={open} onClose={() => setOpen(false)} title="Mais opções" variant="sheet">
        <ul className="-mx-2 flex flex-col">
          {MORE.map((m) => {
            const Icon = m.icon;
            const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-14 items-center gap-4 rounded-xl px-3 hover:bg-canvas", active && "bg-brand-50")}
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{m.label}</span>
                    <span className="block text-sm text-muted">{m.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}
