import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ArticleItem = { id: string; slug: string; title: string; summary: string; icon: string; color: string; type: string };

export function ArticleList({ items, columns = 2 }: { items: ArticleItem[]; columns?: 1 | 2 }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-2", columns === 2 && "2xl:grid-cols-2")}>
      {items.map((a) => {
        const Icon = iconFor(a.icon);
        const tone = toTone(a.color);
        return (
          <li key={a.id}>
            <Link href={`/ajuda/artigos/${a.slug}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 hover:bg-canvas">
              <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{a.title}</span>
                <span className="block text-sm text-muted">{a.summary}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
