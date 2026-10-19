import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, FilePen, Headphones, Lightbulb, MessageCircle, MessagesSquare, Plus, PlusCircle } from "lucide-react";
import { z } from "zod";
import { Breadcrumbs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { DeleteDraftButton } from "@/features/tickets/ticket-actions";
import { TicketFilters } from "@/features/tickets/ticket-filters";
import { cn } from "@/lib/cn";
import { fmtDate, fmtTicketNumber } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listDrafts, listMyTickets, listTicketCategories, type TicketTab } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Minhas solicitações" };

const params = z.object({
  aba: z.enum(["todos", "andamento", "aguardando", "respondidos", "concluidos", "rascunhos"]).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  periodo: z.coerce.number().pipe(z.union([z.literal(30), z.literal(90), z.literal(365)])).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

const isActive = (status: string) => ["aberto", "em_andamento", "respondido"].includes(status);

/** Minhas solicitações — fiel a referencias/Painel REALSEG de Solicitações.png (desktop) e Tela de Solicitações em Aplicativo Corporativo.png (celular). */
export default async function TicketsPage({ searchParams }: PageProps<"/solicitacoes">) {
  const ctx = await requireCtx();
  const sp = params.parse(await searchParams);
  const isDrafts = sp.aba === "rascunhos";
  const [list, categories, drafts] = await Promise.all([
    listMyTickets(ctx, { tab: isDrafts ? "todos" : (sp.aba as TicketTab), q: sp.q, category: sp.categoria, periodDays: sp.periodo, page: sp.page }),
    listTicketCategories(),
    listDrafts(ctx),
  ]);
  const filtered = !!(sp.q || sp.categoria || sp.periodo);
  const href = (patch: Record<string, string | number | undefined>) => {
    const merged: Record<string, string | number | undefined> = { aba: sp.aba, q: sp.q, categoria: sp.categoria, periodo: sp.periodo, ...patch };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "aba" && v === "todos") && !(k === "page" && String(v) === "1")) p.set(k, String(v));
    return `/solicitacoes${p.size ? `?${p}` : ""}`;
  };
  const tabs = [
    { key: "todos", label: "Todos", count: list.counts.todos },
    { key: "andamento", label: "Em andamento", count: list.counts.andamento },
    { key: "aguardando", label: "Aguardando", count: list.counts.aguardando },
    { key: "respondidos", label: "Respondidos", count: list.counts.respondidos },
    { key: "concluidos", label: "Concluídos", count: list.counts.concluidos },
    { key: "rascunhos", label: "Rascunhos", count: drafts.length },
  ];

  return (
    <div className="px-4 pt-5 pb-2 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Minhas solicitações" }]} />

      {/* Cabeçalho: seta + rótulo no celular (título recuado), botão à direita no desktop. */}
      <div className="flex items-start justify-between gap-4">
        <div className="relative pl-9 lg:pl-0">
          <Link href="/" className="absolute top-0.5 -left-2.5 inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-canvas lg:hidden" aria-label="Voltar para o início">
            <ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden />
          </Link>
          <p className="eyebrow mt-3 lg:hidden">Solicitações</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem] lg:mt-3 lg:text-[2.75rem]">Minhas solicitações</h1>
          <p className="mt-2 text-[1.0625rem] leading-snug text-muted lg:text-[1.1875rem]">Abra, acompanhe e resolva suas solicitações de forma simples e rápida.</p>
        </div>
        <ButtonLink href="/solicitacoes/nova" size="lg" className="mt-6 hidden rounded-xl px-10 lg:inline-flex" icon={<PlusCircle className="size-6" aria-hidden />}>
          Nova solicitação
        </ButtonLink>
      </div>
      <Link
        href="/solicitacoes/nova"
        className="relative mt-5 flex min-h-14 items-center justify-center gap-3 rounded-xl bg-brand-700 px-12 text-[1.125rem] font-semibold text-white shadow-[var(--shadow-card)] hover:bg-brand-800 lg:hidden"
      >
        <PlusCircle className="size-6" aria-hidden /> Nova solicitação
        <ChevronRight className="absolute right-4 size-5" aria-hidden />
      </Link>

      <section aria-labelledby="categorias" className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="categorias" className="text-[1.25rem] font-bold tracking-tight text-ink lg:text-[1.375rem]">
            Categorias mais solicitadas
          </h2>
          <Link href="/solicitacoes/nova" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-600 hover:underline">
            Ver todas <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {categories.map((c) => {
            const Icon = iconFor(c.icon);
            const tone = toTone(c.color);
            return (
              <li key={c.slug} className="min-w-0">
                <Link
                  href={`/solicitacoes/nova?categoria=${c.slug}`}
                  className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-canvas to-surface p-2.5 hover:shadow-[var(--shadow-raised)] sm:p-4 lg:flex-row lg:items-center lg:gap-5 lg:p-5"
                  aria-label={`Abrir solicitação de ${c.name}: ${c.description}`}
                >
                  <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12 lg:size-16 lg:rounded-2xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                    <Icon className="size-5 sm:size-6 lg:size-8" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-bold text-ink sm:text-base lg:text-[1.0625rem]">{c.name}</span>
                    <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted sm:text-sm lg:text-[0.9375rem]">{c.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:mt-7 xl:grid-cols-[minmax(0,1fr)_19.5rem]">
        <Card className="max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:p-5" aria-labelledby="lista-solicitacoes">
          {/* Desktop: título, busca e filtros + abas por situação. */}
          <div className="hidden flex-col gap-3 lg:flex lg:flex-row lg:items-center lg:justify-between">
            <h2 id="lista-solicitacoes" className="text-xl font-bold text-ink">
              Minhas solicitações
            </h2>
            {!isDrafts && (
              <div className="flex gap-2">
                <SearchField label="Buscar solicitação" placeholder="Buscar solicitação..." defaultValue={sp.q} hidden={{ aba: sp.aba === "todos" ? undefined : sp.aba, categoria: sp.categoria, periodo: sp.periodo ? String(sp.periodo) : undefined }} className="w-60" />
                <TicketFilters categories={categories} />
              </div>
            )}
          </div>
          <LinkTabs label="Situação das solicitações" size="sm" className="mt-3 hidden lg:block" items={tabs.map((t) => ({ href: href({ aba: t.key, page: undefined }), label: t.label, count: t.count, active: sp.aba === t.key }))} />

          {/* Celular: "Meus tickets" / "Rascunhos" + filtros. */}
          <div className="flex items-end justify-between gap-3 border-b border-line lg:hidden">
            <h2 className="sr-only">Minhas solicitações</h2>
            <LinkTabs
              label="Tipo de lista"
              className="mx-0 -mb-px border-0 px-0 [&_ul]:border-0"
              items={[
                { href: href({ aba: isDrafts ? "todos" : sp.aba, page: undefined }), label: "Meus tickets", active: !isDrafts },
                { href: href({ aba: "rascunhos", page: undefined }), label: "Rascunhos", count: drafts.length || undefined, active: isDrafts },
              ]}
            />
            {!isDrafts && <TicketFilters categories={categories} compact className="mb-1.5 w-11 px-0" />}
          </div>
          {!isDrafts && (sp.aba !== "todos" || filtered) && (
            <p className="mt-3 text-sm text-muted lg:hidden">
              {list.total} {list.total === 1 ? "solicitação" : "solicitações"} com os filtros aplicados.{" "}
              <Link href="/solicitacoes" className="font-semibold text-brand-600 underline">
                Limpar
              </Link>
            </p>
          )}

          {isDrafts ? (
            drafts.length === 0 ? (
              <EmptyState className="mt-5" icon={FilePen} title="Nenhum rascunho" description="Ao preencher uma solicitação, use “Salvar rascunho” para terminar depois." />
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] lg:shadow-none">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700" aria-hidden>
                      <FilePen className="size-5" />
                    </span>
                    <Link href={`/solicitacoes/nova?rascunho=${d.id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{d.subject || "Sem assunto"}</span>
                      <span className="block text-sm text-muted">
                        {d.category?.name ?? "Sem área"} • Editado em {fmtDate(d.updatedAt)}
                      </span>
                    </Link>
                    <Badge tone="slate">Rascunho</Badge>
                    <DeleteDraftButton id={d.id} />
                  </li>
                ))}
              </ul>
            )
          ) : list.items.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon={Headphones}
              title={filtered || sp.aba !== "todos" ? "Nenhuma solicitação encontrada" : "Nenhuma solicitação por aqui"}
              description={filtered || sp.aba !== "todos" ? "Tente outros termos ou limpe os filtros." : "Quando você abrir uma solicitação, ela aparecerá aqui com o prazo previsto."}
              action={
                filtered || sp.aba !== "todos" ? (
                  <ButtonLink href="/solicitacoes" variant="outline">
                    Limpar filtros
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/solicitacoes/nova" icon={<Plus className="size-5" aria-hidden />}>
                    Nova solicitação
                  </ButtonLink>
                )
              }
            />
          ) : (
            <>
              <div className="mt-1 hidden lg:block">
                <table className="w-full table-fixed text-left text-sm">
                  <caption className="sr-only">Solicitações</caption>
                  <colgroup>
                    <col className="w-[6.75rem]" />
                    <col />
                    <col className="w-[6.25rem]" />
                    <col className="w-[7.25rem]" />
                    <col className="w-[7.5rem]" />
                    <col className="w-[8.25rem]" />
                    <col className="w-9" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-line text-[0.8125rem] text-ink">
                      <th scope="col" className="py-3 pl-2 font-semibold">#</th>
                      <th scope="col" className="py-3 pl-1 font-semibold">Título</th>
                      <th scope="col" className="py-3 font-semibold">Categoria</th>
                      <th scope="col" className="py-3 font-semibold">Data de abertura</th>
                      <th scope="col" className="py-3 font-semibold">Prazo</th>
                      <th scope="col" className="py-3 font-semibold">Status</th>
                      <th scope="col" className="py-3">
                        <span className="sr-only">Abrir</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((t) => {
                      const Icon = iconFor(t.category.icon);
                      const tone = toTone(t.category.color);
                      return (
                        <tr key={t.id} className="border-b border-line last:border-0 hover:bg-canvas/70">
                          <td className="py-2 pl-2">
                            <span className="flex items-center gap-2.5">
                              <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                                <Icon className="size-4" />
                              </span>
                              <span className="font-semibold text-ink">{fmtTicketNumber(t.number)}</span>
                            </span>
                          </td>
                          <td className="truncate py-2 pr-3 pl-1 font-medium text-ink">
                            <Link href={`/solicitacoes/${t.number}`} className="hover:underline" title={t.subject}>
                              {t.subject}
                            </Link>
                          </td>
                          <td className="py-2">
                            <Badge tone={tone}>{t.category.name}</Badge>
                          </td>
                          <td className="py-2 text-muted">{fmtDate(t.createdAt)}</td>
                          <td className="py-2 pr-3">{isActive(t.status) ? <SlaMeter sla={t.sla} compact /> : <span className="text-muted">—</span>}</td>
                          <td className="py-2">
                            <TicketStatusBadge status={t.status} />
                          </td>
                          <td className="py-2 text-right">
                            <Link href={`/solicitacoes/${t.number}`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-canvas" aria-label={`Abrir solicitação ${fmtTicketNumber(t.number)}`}>
                              <ChevronRight className="size-5" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="mt-4 flex flex-col gap-2.5 lg:hidden">
                {list.items.map((t) => {
                  const Icon = iconFor(t.category.icon);
                  const tone = toTone(t.category.color);
                  return (
                    <li key={t.id}>
                      <Link href={`/solicitacoes/${t.number}`} className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)] hover:bg-canvas">
                        <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-full", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                          <Icon className="size-6" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">
                          <span className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 min-w-0 text-[0.9375rem] leading-snug font-bold text-ink">
                              {fmtTicketNumber(t.number)} - {t.subject}
                            </span>
                            <span className="shrink-0">
                              <TicketStatusBadge status={t.status} />
                            </span>
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {t.category.name} • Aberto em {fmtDate(t.createdAt)}
                          </span>
                          {isActive(t.status) && t.sla.kind !== "none" && (
                            <span className="mt-2 block max-w-[16rem]">
                              <SlaMeter sla={t.sla} compact />
                            </span>
                          )}
                        </span>
                        <ChevronRight className="size-5 shrink-0 self-center text-ink/70" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5">
                <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="solicitações" makeHref={(p) => href({ page: p })} />
              </div>
            </>
          )}
        </Card>

        {/* Celular: "Precisa de ajuda?" (referência mobile). */}
        <Link href="/ajuda" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-brand-50 p-4 hover:bg-brand-100/70 lg:hidden">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-100/80 text-brand-600" aria-hidden>
            <MessageCircle className="size-7" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold text-ink">Precisa de ajuda?</span>
            <span className="block text-[0.9375rem] leading-snug text-muted">Consulte nossas dúvidas frequentes ou fale com o suporte pelo canal de atendimento.</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink" aria-hidden />
        </Link>

        <aside className="hidden flex-col gap-4 lg:flex" aria-label="Ajuda com solicitações">
          <Card className="hidden p-5 xl:block">
            <div className="flex gap-4">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600" aria-hidden>
                <Headphones className="size-7" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-bold text-ink">Nova solicitação</h2>
                <p className="mt-0.5 text-sm leading-snug text-muted">Precisa de algum serviço, suporte ou informação? Abra uma nova solicitação.</p>
              </div>
            </div>
            <ButtonLink href="/solicitacoes/nova" size="lg" className="mt-4 w-full rounded-xl" iconRight={<ArrowRight className="size-5" aria-hidden />}>
              Abrir solicitação
            </ButtonLink>
          </Card>
          <Card className="border-slate-100 bg-slate-50 p-5">
            <div className="flex gap-3">
              <Lightbulb className="size-6 shrink-0 text-amber-500" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Dica</h2>
                <p className="mt-0.5 text-sm leading-snug text-muted">Antes de abrir uma solicitação, consulte nossa central de ajuda. Você pode encontrar a resposta rapidamente.</p>
                <Link href="/ajuda" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                  Acessar ajuda <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600" aria-hidden>
                <BookOpen className="size-6" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-bold text-ink">Central de ajuda</h2>
                <p className="mt-0.5 text-sm text-muted">Dúvidas frequentes e tutoriais.</p>
                <Link href="/ajuda/artigos" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                  Ver artigos <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                <MessagesSquare className="size-6" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-bold text-ink">Fale com o suporte</h2>
                <p className="mt-0.5 text-sm leading-snug text-muted">Não encontrou o que precisa? Converse com o nosso time pelo chat.</p>
                <Link href="/ajuda/chat" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                  Iniciar conversa <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
