import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { SearchField } from "@/components/ui/filters";
import { EmptyState } from "@/components/ui/primitives";
import { ArticleList } from "@/features/help/article-list";
import { requireCtx } from "@/server/auth/current";
import { searchArticles } from "@/server/services/help";

export const metadata: Metadata = { title: "Base de conhecimento" };

export default async function KnowledgeBasePage({ searchParams }: PageProps<"/ajuda/artigos">) {
  const ctx = await requireCtx();
  const q = z.string().max(100).optional().catch(undefined).parse((await searchParams).q);
  const items = await searchArticles(ctx, { q });
  return (
    <>
      <PageHero eyebrow="Ajuda e suporte" title="Base de conhecimento" subtitle="Tutoriais, artigos e perguntas frequentes." breadcrumb={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte", href: "/ajuda" }, { label: "Base de conhecimento" }]}>
        <SearchField label="Buscar artigos" placeholder="Buscar artigos..." defaultValue={q} size="lg" className="max-w-[41rem]" />
      </PageHero>
      <PageBody>{items.length === 0 ? <EmptyState icon={BookOpen} title="Nenhum artigo encontrado" description="Tente outras palavras." /> : <ArticleList items={items} />}</PageBody>
    </>
  );
}
