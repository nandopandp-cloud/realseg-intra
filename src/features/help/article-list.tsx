import Link from "@/components/ui/app-link";
import { ChevronRight } from "lucide-react";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ArticleItem = { id: string; slug: string; title: string; summary: string; icon: string; color: string; type: string };

/**
 * Lista de artigos da central de ajuda. `columns={2}`: duas colunas em telas grandes e resumo em uma linha
 * (referências "Artigos mais acessados"); `columns={1}`: resumo completo.
 */
export function ArticleList({ items, columns = 2, className, size = "md" }: { items: ArticleItem[]; columns?: 1 | 2; className?: string; size?: "md" | "sm" }) {
  const sm = size === "sm";
  return (
    <ul className={cn("grid grid-cols-1 gap-2", columns === 2 && "lg:grid-cols-2", className)}>
      {items.map((a) => {
        const Icon = iconFor(a.icon);
        const tone = toTone(a.color);
        return (
          <li key={a.id} className="min-w-0">
            <Link href={`/ajuda/artigos/${a.slug}`} className={cn("flex h-full items-center gap-3 rounded-xl border border-line bg-surface hover:bg-canvas", sm ? "px-3 py-2.5 shadow-[var(--shadow-card)] lg:gap-4" : "px-3 py-3")}>
              <span className={cn("inline-flex shrink-0 items-center justify-center rounded-xl", sm ? "size-10" : "size-11", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block leading-snug font-semibold text-ink", sm ? "text-[0.8125rem]" : "text-[0.9375rem]")}>{a.title}</span>
                <span className={cn("block text-muted", sm ? "text-xs" : "text-sm", columns === 2 && "truncate")}>{a.summary}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
