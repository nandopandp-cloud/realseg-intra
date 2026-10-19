"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, Lightbulb } from "lucide-react";
import { api } from "@/lib/api-client";

type Suggestion = { slug: string; title: string; summary: string | null; category: { name: string } };

/**
 * Artigos da central de ajuda relacionados ao texto digitado (consulta com espera de 450 ms).
 * Ajuda a resolver dúvidas simples sem abrir solicitação; nunca bloqueia o envio.
 */
export function ArticleSuggestions({ text, className }: { text: string; className?: string }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const query = text.trim();

  useEffect(() => {
    if (query.length < 4) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api<{ items: Suggestion[] }>(`/help/articles?sugerir=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => setItems(r.items))
        .catch(() => {});
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  if (query.length < 4 || items.length === 0) return null;
  return (
    <section aria-label="Artigos que podem ajudar" aria-live="polite" className={className}>
      <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Lightbulb className="size-4 text-amber-600" aria-hidden /> Talvez estes artigos resolvam sua dúvida
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((a) => (
            <li key={a.slug}>
              <Link href={`/ajuda/artigos/${a.slug}`} target="_blank" className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                <BookOpen className="size-4 shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold text-ink">{a.title}</span>
                  {a.summary && <span className="block truncate text-sm text-muted">{a.summary}</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink/60" aria-hidden />
                <span className="sr-only">(abre em nova aba)</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
