import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { ArticleList } from "@/features/help/article-list";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getHelpCategory, searchArticles } from "@/server/services/help";

export const metadata: Metadata = { title: "Categoria de ajuda" };

export default async function HelpCategoryPage({ params }: PageProps<"/ajuda/categorias/[slug]">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const cat = await orNotFound(getHelpCategory(ctx, slug));
  const items = await searchArticles(ctx, { category: slug });
  return (
    <>
      <PageHero eyebrow="Ajuda e suporte" title={cat.name} subtitle={cat.description} breadcrumb={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte", href: "/ajuda" }, { label: cat.name }]} />
      <PageBody>
        {items.length === 0 ? (
          <EmptyState icon={BookOpen} title="Ainda não há artigos nesta categoria" description="Se precisar, fale com o suporte." action={<ButtonLink href="/solicitacoes/nova">Abrir uma solicitação</ButtonLink>} />
        ) : (
          <ArticleList items={items} />
        )}
      </PageBody>
    </>
  );
}
