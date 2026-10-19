import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MessagesSquare } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Breadcrumbs, Card } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { ArticleFeedback, ArticleViewTracker } from "@/features/help/article-feedback";
import { ArticleList } from "@/features/help/article-list";
import { fmtDateLong } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getArticle } from "@/server/services/help";

export const metadata: Metadata = { title: "Artigo de ajuda" };
const TYPE = { artigo: "Artigo", tutorial: "Tutorial", faq: "Pergunta frequente" } as const;

export default async function ArticlePage({ params }: PageProps<"/ajuda/artigos/[slug]">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const a = await orNotFound(getArticle(ctx, slug));
  return (
    <div className="px-4 pt-5 pb-2 sm:px-6 lg:px-10 lg:pt-8">
      <ArticleViewTracker slug={a.slug} />
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte", href: "/ajuda" }, { label: a.category.name, href: `/ajuda/artigos?categoria=${a.category.slug}` }, { label: a.title }]} />
      <Link href="/ajuda" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Ajuda e suporte
      </Link>
      <div className="mt-2 grid grid-cols-1 gap-6 lg:mt-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">{TYPE[a.type]}</Badge>
            <Link href={`/ajuda/artigos?categoria=${a.category.slug}`} className="rounded-full hover:opacity-80">
              <Badge tone="slate">{a.category.name}</Badge>
            </Link>
          </div>
          <h1 className="mt-3 text-[2rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">{a.title}</h1>
          <p className="mt-2 text-[1.0625rem] text-muted">{a.summary}</p>
          <p className="mt-1 text-sm text-muted">Atualizado em {fmtDateLong(a.updatedAt)}</p>
          <Card className="mt-6 p-5 sm:p-7" as="div">
            <RichText text={a.body} />
          </Card>
          <div className="mt-6">
            <ArticleFeedback slug={a.slug} initial={a.myVote} />
          </div>
        </article>

        <aside className="flex flex-col gap-4" aria-label="Mais ajuda">
          <div className="rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-5">
            <p className="font-bold text-ink">Ainda precisa de ajuda?</p>
            <p className="mt-0.5 text-sm text-muted">Converse com o suporte ou abra uma solicitação{a.relatedTicket ? ` para ${a.relatedTicket.name}` : ""} e acompanhe por protocolo.</p>
            <div className="mt-3 flex flex-col gap-2">
              <ButtonLink href="/ajuda/chat" className="rounded-xl" icon={<MessagesSquare className="size-5" aria-hidden />}>
                Falar com o suporte
              </ButtonLink>
              <ButtonLink
                href={`/solicitacoes/nova?${new URLSearchParams({ ...(a.relatedTicket ? { categoria: a.relatedTicket.slug } : {}), assunto: `Dúvida: ${a.title}` })}`}
                variant="outline"
                className="rounded-xl border-brand-200 bg-surface text-brand-700"
                iconRight={<ArrowRight className="size-4" aria-hidden />}
              >
                Abrir solicitação
              </ButtonLink>
            </div>
          </div>
          {a.related.length > 0 && (
            <section aria-labelledby="relacionados">
              <h2 id="relacionados" className="mb-3 text-lg font-bold text-ink">
                Artigos relacionados
              </h2>
              <ArticleList items={a.related} columns={1} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
