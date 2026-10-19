"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { iconFor } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Categorias de cursos em "chips" com rolagem horizontal. Quando há mais categorias fora da tela,
 * aparece a seta da referência mobile, que rola a lista para o lado.
 */
export function CourseCategoryChips({ categories, active }: { categories: Array<{ slug: string; name: string; icon: string }>; active?: string }) {
  const items = [{ slug: "", name: "Todos", icon: "" }, ...categories];
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <nav aria-label="Categorias de cursos" className="relative -mx-4 sm:mx-0">
      <div ref={scroller} className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-2 pr-10 sm:pr-0">
          {items.map((c) => {
            const on = (active ?? "") === c.slug;
            const Icon = c.slug ? iconFor(c.icon) : LayoutGrid;
            return (
              <li key={c.slug || "todos"}>
                <Link
                  href={c.slug ? `/cursos?categoria=${c.slug}` : "/cursos"}
                  aria-current={on ? "page" : undefined}
                  className={cn("inline-flex min-h-12 items-center gap-2.5 rounded-xl px-4 text-[0.9375rem] font-medium transition-colors", on ? "bg-brand-700 text-white" : "bg-field text-ink hover:bg-line")}
                >
                  <Icon className="size-5" aria-hidden />
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {more && (
        <button
          type="button"
          onClick={() => scroller.current?.scrollBy({ left: 220, behavior: "smooth" })}
          className="absolute top-0 right-0 flex h-12 w-14 items-center justify-end bg-gradient-to-l from-surface via-surface/90 to-transparent pr-3 text-ink"
          aria-label="Ver mais categorias"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </nav>
  );
}
