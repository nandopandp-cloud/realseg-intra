import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowRight, BookOpen, ChevronRight, Clock, FileText, Headphones, Lightbulb, MessageSquareMore, MessagesSquare, SearchX } from "lucide-react";
import { z } from "zod";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { ArticleList } from "@/features/help/article-list";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { cn } from "@/lib/cn";
import { fmtDateLong, fmtTicketNumber } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { helpCategoriesWithCounts, popularArticles, searchArticles } from "@/server/services/help";
import { listMyTickets, supportHours } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Ajuda e suporte" };

/** Atalhos rápidos — títulos em duas linhas e cores da referência (verde, azul, lilás e laranja). */
const SHORTCUTS = [
  {
    href: "/solicitacoes/nova",
    title: ["Abertura", "de solicitação"],
    text: "Registre uma nova demanda para o time de suporte.",
    short: "Registre uma nova demanda",
    icon: FileText,
    card: "from-[#e3f5f0] to-[#f3faf8]",
    tone: "text-brand-600",
    ring: "border-brand-100",
  },
  { href: "/ajuda/artigos", title: ["Base de", "conhecimento"], text: "Tutoriais, manuais e artigos passo a passo.", short: "Tutoriais e artigos passo a passo", icon: BookOpen, card: "from-[#e6effc] to-[#f4f8fe]", tone: "text-blue-600", ring: "border-blue-100" },
  { href: "/ajuda/chat", title: ["Fale com", "o suporte"], text: "Converse com o nosso time em tempo real.", short: "Converse com o nosso time", icon: MessageSquareMore, card: "from-[#eeebfc] to-[#f7f6fe]", tone: "text-indigo-600", ring: "border-indigo-100" },
  {
    href: "/solicitacoes",
    title: ["Acompanhar", "minhas solicitações"],
    text: "Veja o status das suas demandas e interaja com o time.",
    short: "Veja o status das suas demandas",
    icon: Headphones,
    card: "from-[#fcefdf] to-[#fef8f1]",
    tone: "text-amber-600",
    ring: "border-amber-100",
  },
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
        art={{ desktop: { src: "/images/hero-ajuda-ref.webp", width: 536, height: 203, share: 0.428 }, mobile: { src: "/images/mhero-ajuda-ref.webp", width: 364, height: 268, share: 0.431 } }}
      >
        <SearchField label="Buscar na central de ajuda" placeholder="Buscar por dúvidas, tutoriais ou palavras-chave..." defaultValue={q} size="lg" className="max-w-[41rem] lg:[&_input]:h-12" />
      </PageHero>
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex min-w-0 flex-col gap-6">
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
                  <SectionHeader title="Atalhos rápidos" id="atalhos" href="/ajuda/artigos" linkLabel="Ver todos" className="mb-2.5" />
                  <ul className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                    {SHORTCUTS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <li key={s.href} className="min-w-0">
                          <Link href={s.href} className={cn("flex h-full flex-col rounded-[var(--radius-card)] bg-gradient-to-br p-2.5 transition-shadow hover:shadow-[var(--shadow-raised)] sm:p-4 lg:px-5 lg:pt-4 lg:pb-4", s.card)}>
                            <Icon className={cn("size-6 sm:size-8", s.tone)} strokeWidth={1.75} aria-hidden />
                            <span className="mt-2 text-xs leading-tight font-bold text-ink sm:mt-3 sm:text-base">
                              {s.title[0]}
                              <br /> {s.title[1]}
                            </span>
                            <span className="mt-1 flex-1 text-[0.6875rem] leading-snug text-muted sm:mt-2 sm:text-[0.8125rem]">
                              <span className="sm:hidden">{s.short}</span>
                              <span className="hidden sm:inline">{s.text}</span>
                            </span>
                            <span className={cn("mt-3 inline-flex size-8 items-center justify-center rounded-full border bg-surface sm:size-9", s.ring)} aria-hidden>
                              <ArrowRight className={cn("size-4", s.tone)} strokeWidth={2.2} />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section aria-labelledby="categorias-ajuda">
                  <SectionHeader title="Principais categorias" id="categorias-ajuda" href="/ajuda/artigos" linkLabel="Ver todas" className="mb-2.5" />
                  <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                    {categories.map((c, i) => {
                      const Icon = iconFor(c.icon);
                      const tone = toTone(c.color);
                      return (
                        <li key={c.id} className={cn("min-w-0", (i === 2 || i === 5) && "hidden lg:block")}>
                          <Link href={`/ajuda/artigos?categoria=${c.slug}`} className="flex h-full items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-card)] hover:bg-canvas sm:gap-3.5 sm:px-3 sm:py-3">
                            <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-12 sm:rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                              <Icon className="size-5 sm:size-6" strokeWidth={1.9} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs leading-snug font-bold text-ink sm:text-sm">{c.name}</span>
                              <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted sm:text-[0.8125rem] lg:text-xs">{c.description}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-ink sm:size-5" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section aria-labelledby="mais-acessados">
                  <SectionHeader title="Artigos mais acessados" id="mais-acessados" href="/ajuda/artigos" className="mb-2.5" />
                  <ArticleList
                    items={popular}
                    size="sm"
                    className="[&>li:nth-child(2)]:order-4 [&>li:nth-child(3)]:order-2 [&>li:nth-child(4)]:hidden [&>li:nth-child(5)]:order-3 [&>li:nth-child(6)]:hidden lg:[&>li]:order-none lg:[&>li:nth-child(4)]:block lg:[&>li:nth-child(6)]:block"
                  />
                </section>

                {/* Celular: chamada final da referência. */}
                <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-brand-50 p-3 lg:hidden">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100/80 text-brand-600" aria-hidden>
                    <MessageSquareMore className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">Ainda precisa de ajuda?</span>
                    <span className="block text-xs leading-snug text-muted">Nossa equipe está pronta para te atender.</span>
                  </span>
                  <ButtonLink href="/ajuda/chat" size="sm" className="shrink-0 rounded-xl px-3 text-[0.8125rem]" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                    Fale com o suporte
                  </ButtonLink>
                </div>
              </>
            )}
          </div>

          <aside className={cn("flex-col gap-4", results ? "flex" : "hidden lg:flex")} aria-label="Atendimento">
            <Card className="hidden p-4 lg:block">
              <h2 className="text-[1.0625rem] font-bold text-ink">Fale com o suporte</h2>
              <p className="mt-0.5 text-sm text-muted">Nosso time está pronto para te atender.</p>
              <div className="mt-3.5 flex flex-col gap-2">
                <Link href="/solicitacoes/nova" className="flex min-h-12 items-center gap-3 rounded-xl bg-brand-700 px-4 text-[0.9375rem] font-medium text-white hover:bg-brand-800">
                  <MessageSquareMore className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1">Abrir uma solicitação</span>
                  <ArrowRight className="size-[1.125rem] shrink-0" aria-hidden />
                </Link>
                <Link href="/ajuda/chat" className="flex min-h-12 items-center gap-3 rounded-xl bg-canvas px-4 text-[0.9375rem] font-medium text-ink hover:bg-field">
                  <MessageSquareMore className="size-5 shrink-0 text-brand-600" aria-hidden />
                  <span className="flex-1">Chat com o suporte</span>
                  <ArrowRight className="size-[1.125rem] shrink-0" aria-hidden />
                </Link>
              </div>
            </Card>

            {hours && (
              <Card className="flex items-center gap-4 p-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                  <Clock className="size-6" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[0.9375rem] font-bold whitespace-nowrap text-ink">Horário de atendimento</h2>
                  <p className="mt-0.5 text-sm leading-snug text-muted">
                    {hours.label}
                    <br />
                    {hours.hours}
                  </p>
                </div>
                <span className={cn("shrink-0 self-end rounded-full px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap", hours.online ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700")}>
                  {hours.online ? "Online" : "Fora do horário"}
                </span>
              </Card>
            )}

            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[0.9375rem] font-bold text-ink">Minhas solicitações recentes</h2>
                <Link href="/solicitacoes" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                  Ver todas <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              {recent.items.length === 0 ? (
                <p className="mt-1 text-sm text-muted">Você ainda não abriu solicitações.</p>
              ) : (
                <ul>
                  {recent.items.map((t) => (
                    <li key={t.id}>
                      <Link href={`/solicitacoes/${t.number}`} className="flex min-h-[3.25rem] items-center gap-2 rounded-lg py-1.5 hover:bg-canvas">
                        <span className="w-10 shrink-0 self-start pt-0.5 text-xs text-muted">{fmtTicketNumber(t.number)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.8125rem] leading-snug font-semibold text-ink">{t.subject}</span>
                          <span className="block text-xs text-muted">{fmtDateLong(t.createdAt)}</span>
                        </span>
                        <span className="shrink-0 [&>span]:text-[0.6875rem]">
                          <TicketStatusBadge status={t.status} short />
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-ink" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="hidden gap-4 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50/70 p-4 lg:flex">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100/70 text-brand-600" aria-hidden>
                <Lightbulb className="size-6" strokeWidth={1.9} />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-bold text-ink">Não encontrou o que precisa?</h2>
                <p className="mt-0.5 text-sm text-muted">Envie sua dúvida para nossa equipe.</p>
                <Link href="/ajuda/chat" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                  Falar com o suporte <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
