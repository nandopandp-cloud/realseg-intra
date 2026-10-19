import Link from "@/components/ui/app-link";
import { ChevronRight } from "lucide-react";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ArticleItem = { id: string; slug: string; title: string; summary: string; icon: string; color: string; type: string };

/**
 * Lista de artigos da central de ajuda. `columns={2}`: duas colunas em telas grandes e resumo em uma linha
 * (referências "Artigos mais acessados"); `columns={1}`: resumo completo.
 */
export function ArticleList({ items, columns = 2, className }: { items: ArticleItem[]; columns?: 1 | 2; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-2", columns === 2 && "lg:grid-cols-2", className)}>
      {items.map((a) => {
        const Icon = iconFor(a.icon);
        const tone = toTone(a.color);
        return (
          <li key={a.id} className="min-w-0">
            <Link href={`/ajuda/artigos/${a.slug}`} className="flex h-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 hover:bg-canvas">
              <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] leading-snug font-semibold text-ink">{a.title}</span>
                <span className={cn("block text-sm text-muted", columns === 2 && "truncate")}>{a.summary}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
