import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { BookOpen, MessagesSquare } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { iconFor } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { ArticleList } from "@/features/help/article-list";
import { cn } from "@/lib/cn";
import { requireCtx } from "@/server/auth/current";
import { helpCategoriesWithCounts, searchArticles } from "@/server/services/help";

export const metadata: Metadata = { title: "Base de conhecimento" };

const TYPES = [
  { key: undefined, label: "Todos os tipos" },
  { key: "tutorial", label: "Tutoriais" },
  { key: "faq", label: "Perguntas frequentes" },
  { key: "artigo", label: "Artigos" },
] as const;

const params = z.object({
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().regex(/^[a-z0-9-]{1,120}$/).optional().catch(undefined),
  tipo: z.enum(["artigo", "tutorial", "faq"]).optional().catch(undefined),
});

/** Base de conhecimento: busca + filtros por categoria e tipo (tudo na URL — funciona sem JS e ao recarregar). */
export default async function KnowledgeBasePage({ searchParams }: PageProps<"/ajuda/artigos">) {
  const ctx = await requireCtx();
  const sp = params.parse(await searchParams);
  const [items, categories] = await Promise.all([searchArticles(ctx, { q: sp.q, category: sp.categoria, type: sp.tipo }), helpCategoriesWithCounts(ctx)]);
  const current = categories.find((c) => c.slug === sp.categoria);
  const href = (patch: Partial<Record<"categoria" | "tipo", string | undefined>>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, categoria: sp.categoria, tipo: sp.tipo, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/ajuda/artigos${p.size ? `?${p}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium whitespace-nowrap transition-colors", active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-surface text-ink hover:bg-canvas");

  return (
    <>
      <PageHero
        eyebrow="Ajuda e suporte"
        title={current?.name ?? "Base de conhecimento"}
        subtitle={current?.description ?? "Tutoriais, artigos e perguntas frequentes."}
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte", href: "/ajuda" }, ...(current ? [{ label: "Base de conhecimento", href: "/ajuda/artigos" }, { label: current.name }] : [{ label: "Base de conhecimento" }])]}
      >
        <SearchField label="Buscar artigos" placeholder="Buscar artigos..." defaultValue={sp.q} hidden={{ categoria: sp.categoria, tipo: sp.tipo }} size="lg" className="max-w-[41rem]" />
      </PageHero>
      <PageBody>
        <nav aria-label="Categorias" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
            <li>
              <Link href={href({ categoria: undefined })} aria-current={!sp.categoria ? "page" : undefined} className={chip(!sp.categoria)}>
                Todas
              </Link>
            </li>
            {categories.map((c) => {
              const Icon = iconFor(c.icon);
              const active = sp.categoria === c.slug;
              return (
                <li key={c.id}>
                  <Link href={href({ categoria: c.slug })} aria-current={active ? "page" : undefined} className={chip(active)}>
                    <Icon className="size-4" aria-hidden /> {c.name}
                    <span className={cn("text-sm", active ? "text-white/80" : "text-muted")}>({c.articles})</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Tipo de conteúdo">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {TYPES.map((t) => {
                const active = sp.tipo === t.key;
                return (
                  <li key={t.label}>
                    <Link href={href({ tipo: t.key })} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-11 items-center text-[0.9375rem] underline-offset-4", active ? "font-semibold text-brand-700 underline decoration-2" : "text-muted hover:text-ink")}>
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <p className="text-sm text-muted" aria-live="polite">
            {items.length} {items.length === 1 ? "artigo" : "artigos"}
            {sp.q ? ` para “${sp.q}”` : ""}
          </p>
        </div>
        <div className="mt-3">
          {items.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum artigo encontrado"
              description="Tente outras palavras ou outros filtros. Se preferir, fale com o suporte."
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ButtonLink href="/ajuda/artigos" variant="outline">
                    Limpar filtros
                  </ButtonLink>
                  <ButtonLink href="/ajuda/chat" icon={<MessagesSquare className="size-5" aria-hidden />}>
                    Falar com o suporte
                  </ButtonLink>
                </div>
              }
            />
          ) : (
            <ArticleList items={items} />
          )}
        </div>
      </PageBody>
    </>
  );
}
