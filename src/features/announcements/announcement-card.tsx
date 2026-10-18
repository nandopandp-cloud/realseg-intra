import Link from "next/link";
import { BookOpen, ChevronRight, CircleCheck, Megaphone } from "lucide-react";
import { IconByKey, toTone, TONE } from "@/components/ui/icons";
import { CategoryLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtDateLong } from "@/lib/format";

export type AnnouncementListItem = {
  id: string;
  title: string;
  summary: string;
  isImportant: boolean;
  requiresAck: boolean;
  publishedAt: Date | null;
  isRead: boolean;
  isAcknowledged: boolean;
  isFavorite: boolean;
  category: { slug: string; name: string; color: string; icon: string };
};

export function AnnouncementCard({ a }: { a: AnnouncementListItem }) {
  const tone = a.isImportant ? "teal" : toTone(a.category.color);
  return (
    <Link
      href={`/comunicados/${a.id}`}
      className={cn(
        "group flex gap-4 rounded-[var(--radius-card)] border p-4 transition-shadow hover:shadow-[var(--shadow-raised)] sm:gap-5 sm:p-5",
        a.isImportant ? "border-brand-100 bg-brand-50/80" : "border-line bg-surface",
      )}
    >
      <span className={cn("inline-flex size-14 shrink-0 items-center justify-center rounded-2xl sm:size-[4.5rem]", a.isImportant ? "bg-brand-100" : TONE[tone].tile, TONE[tone].icon)} aria-hidden>
        {a.isImportant ? <Megaphone className="size-7 sm:size-8" strokeWidth={1.9} /> : <IconByKey name={a.category.icon} className="size-7 sm:size-8" strokeWidth={1.9} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CategoryLabel tone={a.isImportant ? "teal" : tone}>{a.isImportant ? "Importante" : a.category.name}</CategoryLabel>
          {a.publishedAt && <span className="text-sm text-muted">{fmtDateLong(a.publishedAt)}</span>}
        </span>
        <span className={cn("mt-1.5 block text-[1.0625rem] leading-snug text-ink sm:text-[1.1875rem]", a.isRead ? "font-semibold" : "font-bold")}>
          {a.title}
          {!a.isRead && (
            <span className="ml-2 inline-flex translate-y-[-2px] items-center rounded-full bg-blue-100 px-2 py-0.5 align-middle text-xs font-semibold text-blue-700">Não lido</span>
          )}
        </span>
        <span className="mt-1 block text-[0.9375rem] leading-relaxed text-muted sm:text-base">{a.summary}</span>
        {a.requiresAck &&
          (a.isAcknowledged ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              <CircleCheck className="size-4" aria-hidden /> Ciência confirmada
            </span>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-surface/60 px-3 py-1 text-sm font-semibold text-brand-700">
              <BookOpen className="size-4" aria-hidden /> Leitura obrigatória
            </span>
          ))}
      </span>
      <ChevronRight className="mt-6 size-6 shrink-0 self-start text-ink/80 transition-transform group-hover:translate-x-0.5 sm:self-center" aria-hidden />
    </Link>
  );
}
