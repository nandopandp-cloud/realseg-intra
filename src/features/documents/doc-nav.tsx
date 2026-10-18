"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronRight, Clock, CloudUpload, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/documentos", label: "Meus documentos", sub: "Holerites, atestados e mais", icon: FileText },
  { href: "/documentos/enviar", label: "Enviar documento", sub: "Envie arquivos para o RH", icon: CloudUpload },
  { href: "/documentos/normas", label: "Normas e manuais", sub: "Procedimentos e regulamentos", icon: BookOpen },
  { href: "/documentos/historico", label: "Histórico", sub: "Documentos enviados e recebidos", icon: Clock },
];

/** Sub-navegação da área de documentos (cards no desktop, blocos no celular). */
export function DocumentsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções de documentos">
      <ul className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          const Icon = it.icon;
          return (
            <li key={it.href} className="min-w-0">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center gap-2 rounded-[var(--radius-card)] border px-1.5 py-3 text-center transition-colors lg:flex-row lg:items-start lg:gap-4 lg:px-5 lg:py-5 lg:text-left",
                  active ? "border-brand-200 bg-brand-50" : "border-line bg-surface hover:bg-canvas",
                )}
              >
                <Icon className={cn("size-7 shrink-0 lg:size-8", active ? "text-brand-600" : "text-ink")} strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[0.8125rem] leading-tight text-ink sm:text-[0.9375rem] lg:text-[1.0625rem]", active ? "font-bold" : "font-semibold")}>{it.label}</span>
                  <span className="mt-0.5 hidden text-sm text-muted lg:block">{it.sub}</span>
                </span>
                {active && <ChevronRight className="hidden size-5 self-center text-ink lg:block" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
