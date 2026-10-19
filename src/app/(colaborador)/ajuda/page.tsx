import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowRight, BookOpen, ChevronRight, Clock, FileText, Headphones, Lightbulb, MessageSquareMore, MessagesSquare, SearchX } from "lucide-react";
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

/** Atalhos rápidos (cores das referências: verde, azul, lilás e laranja). */
const SHORTCUTS = [
  { href: "/solicitacoes/nova", title: "Abertura de solicitação", text: "Registre uma nova demanda para o time de suporte.", short: "Registre uma nova demanda", icon: FileText, card: "bg-[#e9f6f3]", tone: "text-brand-600" },
  { href: "/ajuda/artigos", title: "Base de conhecimento", text: "Tutoriais, manuais e artigos passo a passo.", short: "Tutoriais e artigos passo a passo", icon: BookOpen, card: "bg-[#ebf2fc]", tone: "text-blue-600" },
  { href: "/ajuda/chat", title: "Fale com o suporte", text: "Converse com o nosso time pelo chat.", short: "Converse com o nosso time", icon: MessageSquareMore, card: "bg-[#f1effc]", tone: "text-indigo-600" },
  { href: "/solicitacoes", title: "Acompanhar minhas solicitações", text: "Veja o status das suas demandas e interaja com o time.", short: "Veja o status das suas demandas", icon: Headphones, card: "bg-[#fdf3e7]", tone: "text-amber-600" },
];

/** Ajuda e suporte — fiel a referencias/Central de Ajuda REALSEG.png (desktop) e Portal de Ajuda e Suporte REALSEG.png (celular). */
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
        image="/images/hero-ajuda.webp"
        mobileImage="/images/mhero-ajuda.webp"
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
                    action={
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <ButtonLink href="/ajuda/chat" icon={<MessagesSquare className="size-5" aria-hidden />}>
                          Falar com o suporte
                        </ButtonLink>
                        <ButtonLink href="/solicitacoes/nova" variant="outline">
                          Abrir uma solicitação
                        </ButtonLink>
                      </div>
                    }
                  />
                ) : (
                  <ArticleList items={results} columns={1} />
                )}
              </section>
            ) : (
              <>
                <section aria-labelledby="atalhos">
                  <SectionHeader title="Atalhos rápidos" id="atalhos" href="/ajuda/artigos" linkLabel="Ver todos" className="mb-3" />
                  <ul className="grid grid-cols-4 gap-1.5 sm:gap-3">
                    {SHORTCUTS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <li key={s.title} className="min-w-0">
                          <Link href={s.href} className={cn("flex h-full flex-col rounded-[var(--radius-card)] p-2.5 hover:shadow-[var(--shadow-raised)] sm:p-4 lg:p-5", s.card)}>
                            <Icon className={cn("size-7 sm:size-8", s.tone)} strokeWidth={1.75} aria-hidden />
                            <span className="mt-2 text-[0.8125rem] leading-snug font-bold text-ink sm:mt-3 sm:text-base">{s.title}</span>
                            <span className="mt-1 flex-1 text-[0.6875rem] leading-snug text-muted sm:text-sm">
                              <span className="sm:hidden">{s.short}</span>
                              <span className="hidden sm:inline">{s.text}</span>
                            </span>
                            <span className="mt-3 inline-flex size-8 items-center justify-center rounded-full border border-line bg-surface sm:size-9" aria-hidden>
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
                  <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                    {categories.map((c, i) => {
                      const Icon = iconFor(c.icon);
                      const tone = toTone(c.color);
                      return (
                        <li key={c.id} className={cn("min-w-0", i >= 4 && "hidden lg:block")}>
                          <Link href={`/ajuda/categorias/${c.slug}`} className="flex h-full items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5 hover:bg-canvas sm:gap-3 sm:p-3">
                            <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11 lg:size-12", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                              <Icon className="size-5 sm:size-6" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm leading-snug font-semibold text-ink sm:text-[0.9375rem]">{c.name}</span>
                              <span className="block text-xs leading-snug text-muted sm:text-[0.8125rem]">{c.description}</span>
                            </span>
                            <ChevronRight className="hidden size-5 shrink-0 text-ink/70 sm:block" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section aria-labelledby="mais-acessados">
                  <SectionHeader title="Artigos mais acessados" id="mais-acessados" href="/ajuda/artigos" className="mb-3" />
                  <ArticleList items={popular} className="[&>li:nth-child(n+5)]:hidden lg:[&>li:nth-child(n+5)]:block" />
                </section>

                {/* Celular: chamada final da referência. */}
                <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-brand-50 p-4 lg:hidden">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100/80 text-brand-600" aria-hidden>
                    <MessagesSquare className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">Ainda precisa de ajuda?</span>
                    <span className="block text-sm text-muted">Nossa equipe está pronta para te atender.</span>
                  </span>
                  <ButtonLink href="/ajuda/chat" className="w-full rounded-xl sm:w-auto" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                    Fale com o suporte
                  </ButtonLink>
                </div>
              </>
            )}
          </div>

          <aside className="flex flex-col gap-4" aria-label="Atendimento">
            <Card className="hidden p-5 lg:block">
              <h2 className="text-lg font-bold text-ink">Fale com o suporte</h2>
              <p className="text-[0.9375rem] text-muted">Nosso time está pronto para te atender.</p>
              <div className="mt-4 flex flex-col gap-2">
                <ButtonLink href="/solicitacoes/nova" size="lg" className="justify-start rounded-xl" icon={<MessageSquareMore className="size-5" aria-hidden />} iconRight={<ArrowRight className="ml-auto size-5" aria-hidden />}>
                  Abrir uma solicitação
                </ButtonLink>
                <ButtonLink href="/ajuda/chat" variant="subtle" size="lg" className="justify-start rounded-xl" icon={<MessagesSquare className="size-5 text-brand-600" aria-hidden />} iconRight={<ArrowRight className="ml-auto size-5" aria-hidden />}>
                  Chat com o suporte
                </ButtonLink>
              </div>
            </Card>
            {hours && (
              <Card className="flex items-start gap-3 p-5">
                <Clock className="size-7 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-ink">Horário de atendimento</h2>
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-[0.9375rem] text-muted">
                      {hours.label}
                      <br />
                      {hours.hours}
                    </p>
                    <Badge tone={hours.online ? "green" : "slate"} className="mb-0.5 shrink-0 whitespace-nowrap">
                      {hours.online ? "Online" : "Fora do horário"}
                    </Badge>
                  </div>
                </div>
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
                        <span className="w-11 shrink-0 text-xs text-muted">{fmtTicketNumber(t.number)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{t.subject}</span>
                          <span className="block text-xs whitespace-nowrap text-muted">{fmtDateLong(t.createdAt)}</span>
                        </span>
                        <span className="shrink-0">
                          <TicketStatusBadge status={t.status} short />
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-ink/60" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="hidden gap-3 border-brand-100 bg-brand-50 p-5 lg:flex">
              <Lightbulb className="size-7 shrink-0 text-brand-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Não encontrou o que precisa?</h2>
                <p className="text-sm text-muted">Envie sua dúvida para nossa equipe.</p>
                <Link href="/ajuda/chat" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-brand-600 hover:underline">
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
