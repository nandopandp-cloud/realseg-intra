import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Clock, FileText, Headphones, Lightbulb, MessageSquareMore, SearchX } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { ArticleList } from "@/features/help/article-list";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { cn } from "@/lib/cn";
import { fmtDateLong, fmtTicketNumber } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { helpCategoriesWithCounts, popularArticles, searchArticles } from "@/server/services/help";
import { listMyTickets, supportHours } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Ajuda e suporte" };

const SHORTCUTS = [
  { href: "/solicitacoes/nova", title: "Abertura de solicitação", text: "Registre uma nova demanda para o time de suporte.", icon: FileText, card: "from-brand-50", tone: "text-brand-600" },
  { href: "/ajuda/artigos", title: "Base de conhecimento", text: "Tutoriais, manuais e artigos passo a passo.", icon: BookOpen, card: "from-blue-50", tone: "text-blue-600" },
  { href: "/solicitacoes/nova?categoria=ti", title: "Fale com o suporte", text: "Converse com o nosso time por mensagens.", icon: MessageSquareMore, card: "from-indigo-50", tone: "text-indigo-600" },
  { href: "/solicitacoes", title: "Acompanhar minhas solicitações", text: "Veja o status das suas demandas e interaja com o time.", icon: Headphones, card: "from-amber-50", tone: "text-amber-600" },
];

export default async function HelpPage({ searchParams }: PageProps<"/ajuda">) {
  const ctx = await requireCtx();
  const q = z.string().max(100).optional().catch(undefined).parse((await searchParams).q)?.trim();
  const [categories, popular, results, hours, recent] = await Promise.all([
    helpCategoriesWithCounts(ctx),
    popularArticles(ctx, 6),
    q ? searchArticles(ctx, { q }) : Promise.resolve(null),
    supportHours(),
    listMyTickets(ctx, { pageSize: 3 }),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Ajuda e suporte"
        title="Como podemos te ajudar?"
        subtitle="Encontre respostas, tutoriais e fale com o nosso time de suporte."
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte" }]}
        image="/images/hero-ajuda.jpg"
        mobileImage="/images/mhero-ajuda.jpg"
      >
        <SearchField label="Buscar na central de ajuda" placeholder="Buscar por dúvidas, tutoriais ou palavras-chave..." defaultValue={q} size="lg" className="max-w-[41rem]" />
      </PageHero>
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex min-w-0 flex-col gap-7">
            {results ? (
              <section aria-labelledby="resultados">
                <SectionHeader title={`Resultados para “${q}”`} id="resultados" className="mb-3" action={<Link href="/ajuda" className="text-[0.9375rem] font-medium text-brand-600">Limpar busca</Link>} />
                {results.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title="Não encontramos artigos para essa busca"
                    description="Tente palavras diferentes ou fale com o suporte — vamos te ajudar."
                    action={<ButtonLink href="/solicitacoes/nova">Abrir uma solicitação</ButtonLink>}
                  />
                ) : (
                  <ArticleList items={results} />
                )}
              </section>
            ) : (
              <>
                <section aria-labelledby="atalhos">
                  <SectionHeader title="Atalhos rápidos" id="atalhos" className="mb-3" />
                  <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {SHORTCUTS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <li key={s.title} className="min-w-0">
                          <Link href={s.href} className={cn("flex h-full flex-col rounded-[var(--radius-card)] border border-line/70 bg-gradient-to-br to-surface p-4 hover:shadow-[var(--shadow-raised)] sm:p-5", s.card)}>
                            <Icon className={cn("size-8", s.tone)} strokeWidth={1.75} aria-hidden />
                            <span className="mt-3 leading-snug font-bold text-ink">{s.title}</span>
                            <span className="mt-1 flex-1 text-sm text-muted">{s.text}</span>
                            <span className="mt-3 inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface" aria-hidden>
                              <ArrowRight className={cn("size-4", s.tone)} />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section aria-labelledby="categorias-ajuda">
                  <SectionHeader title="Principais categorias" id="categorias-ajuda" href="/ajuda/artigos" linkLabel="Ver todas" className="mb-3" />
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                    {categories.map((c) => {
                      const Icon = iconFor(c.icon);
                      const tone = toTone(c.color);
                      return (
                        <li key={c.id}>
                          <Link href={`/ajuda/categorias/${c.slug}`} className="flex h-full items-center gap-3 rounded-xl border border-line p-3 hover:bg-canvas">
                            <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                              <Icon className="size-6" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-ink">{c.name}</span>
                              <span className="block text-sm text-muted">{c.description}</span>
                            </span>
                            <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section aria-labelledby="mais-acessados">
                  <SectionHeader title="Artigos mais acessados" id="mais-acessados" href="/ajuda/artigos" className="mb-3" />
                  <ArticleList items={popular} />
                </section>
              </>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="text-lg font-bold text-ink">Fale com o suporte</h2>
              <p className="text-[0.9375rem] text-muted">Nosso time está pronto para te atender.</p>
              <div className="mt-4 flex flex-col gap-2">
                <ButtonLink href="/solicitacoes/nova" size="lg" className="justify-start" icon={<MessageSquareMore className="size-5" aria-hidden />} iconRight={<ArrowRight className="ml-auto size-5" aria-hidden />}>
                  Abrir uma solicitação
                </ButtonLink>
                <ButtonLink href="/fale-com-rh" variant="subtle" size="lg" className="justify-start" icon={<MessageSquareMore className="size-5 text-brand-600" aria-hidden />} iconRight={<ArrowRight className="ml-auto size-5" aria-hidden />}>
                  Mensagem para o RH
                </ButtonLink>
              </div>
            </Card>
            {hours && (
              <Card className="flex gap-3 p-5">
                <Clock className="size-7 shrink-0 text-brand-600" aria-hidden />
                <div className="flex-1">
                  <h2 className="font-bold text-ink">Horário de atendimento</h2>
                  <p className="text-[0.9375rem] text-muted">{hours.label}</p>
                  <p className="text-[0.9375rem] text-muted">{hours.hours}</p>
                </div>
                <Badge tone={hours.online ? "green" : "slate"}>{hours.online ? "Online" : "Fora do horário"}</Badge>
              </Card>
            )}
            <Card className="p-5">
              <SectionHeader title="Minhas solicitações recentes" href="/solicitacoes" linkLabel="Ver todas" as="h2" className="[&_h2]:text-base" />
              {recent.items.length === 0 ? (
                <p className="mt-2 text-[0.9375rem] text-muted">Você ainda não abriu solicitações.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {recent.items.map((t) => (
                    <li key={t.id}>
                      <Link href={`/solicitacoes/${t.number}`} className="flex min-h-14 items-center gap-2 py-2.5 hover:bg-canvas">
                        <span className="w-12 text-sm text-muted">{fmtTicketNumber(t.number)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-semibold text-ink">{t.subject}</span>
                          <span className="block text-xs text-muted">{fmtDateLong(t.createdAt)}</span>
                        </span>
                        <TicketStatusBadge status={t.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="flex gap-3 border-brand-100 bg-brand-50 p-5">
              <Lightbulb className="size-7 shrink-0 text-brand-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Não encontrou o que precisa?</h2>
                <p className="text-sm text-muted">Envie sua dúvida para nossa equipe.</p>
                <Link href="/solicitacoes/nova" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-brand-600">
                  Falar com o suporte <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
