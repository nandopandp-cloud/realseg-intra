import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ChevronRight, Search, SearchX } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { SearchField } from "@/components/ui/filters";
import { Card, EmptyState } from "@/components/ui/primitives";
import { requireCtx } from "@/server/auth/current";
import { globalSearch, type SearchResult } from "@/server/services/search";

export const metadata: Metadata = { title: "Busca" };

export default async function SearchPage({ searchParams }: PageProps<"/busca">) {
  const ctx = await requireCtx();
  const q = z.string().max(100).optional().catch(undefined).parse((await searchParams).q)?.trim() ?? "";
  const results = q.length >= 2 ? await globalSearch(ctx, q) : [];
  const groups = results.reduce<Record<string, SearchResult[]>>((acc, r) => ((acc[r.group] ??= []).push(r), acc), {});
  return (
    <>
      <PageHero eyebrow="Busca" title="Pesquisar na intranet" subtitle="Comunicados, documentos, cursos, ajuda e solicitações." breadcrumb={[{ label: "Início", href: "/" }, { label: "Busca" }]}>
        <SearchField label="Pesquisar na intranet" placeholder="O que você procura?" defaultValue={q} size="lg" className="max-w-[41rem]" />
      </PageHero>
      <PageBody>
        {q.length < 2 ? (
          <EmptyState icon={Search} title="Digite pelo menos 2 caracteres" description="Ex.: holerite, férias, uniforme, senha." />
        ) : results.length === 0 ? (
          <EmptyState icon={SearchX} title={`Nada encontrado para “${q}”`} description="Tente outras palavras ou consulte a central de ajuda." />
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-[0.9375rem] text-muted" role="status">
              {results.length} resultado(s) para “{q}”
            </p>
            {Object.entries(groups).map(([group, items]) => (
              <section key={group} aria-labelledby={`g-${group}`}>
                <h2 id={`g-${group}`} className="mb-2 text-lg font-bold text-ink">
                  {group}
                </h2>
                <Card className="p-1">
                  <ul className="divide-y divide-line">
                    {items.map((r) => (
                      <li key={r.href}>
                        <Link href={r.href} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-canvas">
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">{r.title}</span>
                            {r.description && <span className="block truncate text-sm text-muted">{r.description}</span>}
                          </span>
                          <ChevronRight className="size-5 text-ink/70" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
