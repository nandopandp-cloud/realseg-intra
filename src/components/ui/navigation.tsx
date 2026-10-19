import Link from "@/components/ui/app-link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Abas de navegação (cada aba é uma URL — funciona sem JS e preserva estado ao recarregar). */
export function LinkTabs({
  items,
  label,
  className,
  size = "md",
}: {
  items: Array<{ href: string; label: ReactNode; active: boolean; icon?: ReactNode; count?: number; badge?: number }>;
  label: string;
  className?: string;
  /** "sm": abas compactas dentro de cards (referência de Solicitações). */
  size?: "md" | "sm";
}) {
  return (
    <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="flex min-w-max items-stretch gap-1 border-b border-line">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={it.active ? "page" : undefined}
              scroll={false}
              className={cn(
                "relative inline-flex items-center gap-2 font-medium whitespace-nowrap transition-colors",
                size === "sm" ? "min-h-11 px-3 text-sm" : "min-h-12 px-3 text-[0.9375rem] sm:px-4",
                it.active ? "text-brand-700" : "text-muted hover:text-ink",
              )}
            >
              {it.icon}
              <span>
                {it.label}
                {it.count != null && <span> ({it.count})</span>}
              </span>
              {it.badge != null && it.badge > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 py-0.5 text-xs font-bold text-white">
                  {it.badge}
                  <span className="sr-only"> não lidos</span>
                </span>
              )}
              {it.active && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand-600" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Paginação por links. `makeHref(page)` preserva os filtros atuais. */
export function Pagination({
  page,
  pageCount,
  total,
  shown,
  noun,
  makeHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  shown: number;
  noun: string;
  makeHref: (page: number) => string;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">
        Mostrando {shown} de {total} {noun}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Paginação">
          <ul className="flex items-center gap-1 rounded-xl border border-line p-1">
            <li>
              {page > 1 ? (
                <Link href={makeHref(page - 1)} className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-canvas" aria-label="Página anterior">
                  <ChevronLeft className="size-5" aria-hidden />
                </Link>
              ) : (
                <span className="inline-flex size-10 items-center justify-center text-subtle" aria-hidden>
                  <ChevronLeft className="size-5" />
                </span>
              )}
            </li>
            {pages.map((p, i) => (
              <li key={p} className="flex items-center">
                {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
                <Link
                  href={makeHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Página ${p}`}
                  className={cn("inline-flex size-10 items-center justify-center rounded-lg text-sm font-semibold", p === page ? "bg-brand-700 text-white" : "text-ink hover:bg-canvas")}
                >
                  {p}
                </Link>
              </li>
            ))}
            <li>
              {page < pageCount ? (
                <Link href={makeHref(page + 1)} className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-canvas" aria-label="Próxima página">
                  <ChevronRight className="size-5" aria-hidden />
                </Link>
              ) : (
                <span className="inline-flex size-10 items-center justify-center text-subtle" aria-hidden>
                  <ChevronRight className="size-5" />
                </span>
              )}
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
