import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, FilePen, Headphones, Lightbulb, MessageCircle, Plus, PlusCircle } from "lucide-react";
import { z } from "zod";
import { Breadcrumbs } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SearchField, FilterSelect } from "@/components/ui/filters";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { DeleteDraftButton } from "@/features/tickets/ticket-actions";
import { cn } from "@/lib/cn";
import { fmtDate, fmtTicketNumber } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listDrafts, listMyTickets, listTicketCategories, type TicketTab } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Minhas solicitações" };

const params = z.object({
  aba: z.enum(["todos", "andamento", "aguardando", "respondidos", "concluidos", "rascunhos"]).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export default async function TicketsPage({ searchParams }: PageProps<"/solicitacoes">) {
  const ctx = await requireCtx();
  const sp = params.parse(await searchParams);
  const isDrafts = sp.aba === "rascunhos";
  const [list, categories, drafts] = await Promise.all([
    listMyTickets(ctx, { tab: isDrafts ? "todos" : (sp.aba as TicketTab), q: sp.q, category: sp.categoria, page: sp.page }),
    listTicketCategories(),
    listDrafts(ctx),
  ]);
  const href = (patch: Record<string, string | number | undefined>) => {
    const merged: Record<string, string | number | undefined> = { aba: sp.aba, q: sp.q, categoria: sp.categoria, ...patch };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "aba" && v === "todos") && !(k === "page" && String(v) === "1")) p.set(k, String(v));
    return `/solicitacoes${p.size ? `?${p}` : ""}`;
  };
  const tabs = [
    { key: "todos", label: "Todos", count: list.counts.todos },
    { key: "andamento", label: "Em andamento", count: list.counts.andamento },
    { key: "aguardando", label: "Aguardando você", count: list.counts.aguardando },
    { key: "respondidos", label: "Respondidos", count: list.counts.respondidos },
    { key: "concluidos", label: "Concluídos", count: list.counts.concluidos },
    { key: "rascunhos", label: "Rascunhos", count: drafts.length },
  ];

  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Minhas solicitações" }]} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Link href="/" className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-brand-600 lg:hidden" aria-label="Voltar ao início">
            <ArrowLeft className="size-6" aria-hidden />
          </Link>
          <div>
            <p className="eyebrow mt-3 lg:hidden">Solicitações</p>
            <h1 className="mt-1 text-[2.125rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem] lg:mt-3 lg:text-[2.75rem]">Minhas solicitações</h1>
            <p className="mt-2 text-[1.0625rem] text-muted lg:text-[1.1875rem]">Abra, acompanhe e resolva suas solicitações de forma simples e rápida.</p>
          </div>
        </div>
        <ButtonLink href="/solicitacoes/nova" size="lg" className="mt-6 hidden rounded-xl px-8 lg:inline-flex" icon={<PlusCircle className="size-6" aria-hidden />}>
          Nova solicitação
        </ButtonLink>
      </div>
      <ButtonLink href="/solicitacoes/nova" size="lg" className="mt-5 w-full rounded-xl text-[1.0625rem] lg:hidden" icon={<PlusCircle className="size-6" aria-hidden />} iconRight={<ChevronRight className="ml-auto size-5" aria-hidden />}>
        Nova solicitação
      </ButtonLink>

      <section aria-labelledby="categorias" className="mt-7">
        <SectionHeader title="Categorias mais solicitadas" id="categorias" className="mb-3" />
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = iconFor(c.icon);
            const tone = toTone(c.color);
            return (
              <li key={c.slug} className="min-w-0">
                <Link href={`/solicitacoes/nova?categoria=${c.slug}`} className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-canvas to-surface p-4 hover:shadow-[var(--shadow-raised)] lg:flex-row lg:items-center lg:p-5">
                  <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-xl lg:size-16 lg:rounded-2xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                    <Icon className="size-6 lg:size-8" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block font-bold text-ink">{c.name}</span>
                    <span className="block text-sm text-muted">{c.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="p-4 sm:p-5" aria-labelledby="lista-solicitacoes">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 id="lista-solicitacoes" className="text-xl font-bold text-ink">
              Minhas solicitações
            </h2>
            {!isDrafts && (
              <div className="flex gap-2">
                <SearchField label="Buscar solicitação" placeholder="Buscar solicitação..." defaultValue={sp.q} hidden={{ aba: sp.aba === "todos" ? undefined : sp.aba, categoria: sp.categoria }} className="flex-1 md:w-56" />
                <FilterSelect name="categoria" label="Categoria" options={[{ value: "", label: "Todas" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} className="w-32" />
              </div>
            )}
          </div>
          <LinkTabs label="Situação das solicitações" className="mt-3" items={tabs.map((t) => ({ href: href({ aba: t.key, page: undefined }), label: t.label, count: t.count, active: sp.aba === t.key }))} />

          {isDrafts ? (
            drafts.length === 0 ? (
              <EmptyState className="mt-5" icon={FilePen} title="Nenhum rascunho" description="Ao preencher uma solicitação, use “Salvar rascunho” para terminar depois." />
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <Link href={`/solicitacoes/nova?rascunho=${d.id}`} className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{d.subject || "Sem assunto"}</span>
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
              title={sp.q || sp.categoria ? "Nenhuma solicitação encontrada" : "Nenhuma solicitação por aqui"}
              description={sp.q || sp.categoria ? "Tente outros termos ou limpe os filtros." : "Quando você abrir uma solicitação, ela aparecerá aqui com o prazo previsto."}
              action={<ButtonLink href="/solicitacoes/nova" icon={<Plus className="size-5" aria-hidden />}>Nova solicitação</ButtonLink>}
            />
          ) : (
            <>
              <div className="mt-2 hidden lg:block">
                <table className="w-full text-left text-[0.9375rem]">
                  <caption className="sr-only">Solicitações</caption>
                  <thead>
                    <tr className="border-b border-line text-sm text-ink">
                      <th scope="col" className="py-3 pl-2 font-semibold">#</th>
                      <th scope="col" className="py-3 font-semibold">Título</th>
                      <th scope="col" className="py-3 font-semibold">Categoria</th>
                      <th scope="col" className="py-3 font-semibold">Abertura</th>
                      <th scope="col" className="py-3 font-semibold">Prazo</th>
                      <th scope="col" className="py-3 font-semibold">Status</th>
                      <th scope="col" className="py-3"><span className="sr-only">Abrir</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((t) => {
                      const Icon = iconFor(t.category.icon);
                      const tone = toTone(t.category.color);
                      return (
                        <tr key={t.id} className="border-b border-line last:border-0 hover:bg-canvas/70">
                          <td className="py-2.5 pl-2">
                            <span className="flex items-center gap-3">
                              <span className={cn("inline-flex size-9 items-center justify-center rounded-full", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                                <Icon className="size-4" />
                              </span>
                              <span className="font-semibold text-ink">{fmtTicketNumber(t.number)}</span>
                            </span>
                          </td>
                          <td className="py-2.5 font-medium text-ink">
                            <Link href={`/solicitacoes/${t.number}`} className="hover:underline">
                              {t.subject}
                            </Link>
                          </td>
                          <td className="py-2.5">
                            <Badge tone={tone}>{t.category.name}</Badge>
                          </td>
                          <td className="py-2.5 text-muted">{fmtDate(t.createdAt)}</td>
                          <td className="py-2.5">{["aberto", "em_andamento", "respondido"].includes(t.status) ? <SlaMeter sla={t.sla} compact /> : <span className="text-muted">—</span>}</td>
                          <td className="py-2.5">
                            <TicketStatusBadge status={t.status} />
                          </td>
                          <td className="py-2.5 pr-1 text-right">
                            <Link href={`/solicitacoes/${t.number}`} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-canvas" aria-label={`Abrir solicitação ${fmtTicketNumber(t.number)}`}>
                              <ChevronRight className="size-5" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="mt-4 flex flex-col gap-2 lg:hidden">
                {list.items.map((t) => {
                  const Icon = iconFor(t.category.icon);
                  const tone = toTone(t.category.color);
                  const active = ["aberto", "em_andamento", "respondido"].includes(t.status);
                  return (
                    <li key={t.id}>
                      <Link href={`/solicitacoes/${t.number}`} className="flex gap-3 rounded-[var(--radius-card)] border border-line p-3.5 hover:bg-canvas">
                        <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-full", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                          <Icon className="size-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-ink">
                            {fmtTicketNumber(t.number)} - {t.subject}
                          </span>
                          <span className="block text-sm text-muted">
                            {t.category.name} • Aberto em {fmtDate(t.createdAt)}
                          </span>
                          <span className="mt-2 block">
                            <TicketStatusBadge status={t.status} />
                          </span>
                          {active && t.sla.kind !== "none" && (
                            <span className="mt-2 block">
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

        <aside className="flex flex-col gap-4" aria-label="Ajuda com solicitações">
          <Card className="hidden p-5 xl:block">
            <div className="flex gap-3">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                <Headphones className="size-6" />
              </span>
              <div>
                <h2 className="font-bold text-ink">Nova solicitação</h2>
                <p className="text-sm text-muted">Precisa de algum serviço, suporte ou informação? Abra uma nova solicitação.</p>
              </div>
            </div>
            <ButtonLink href="/solicitacoes/nova" className="mt-4 w-full" iconRight={<ArrowRight className="size-5" aria-hidden />}>
              Abrir solicitação
            </ButtonLink>
          </Card>
          <Card className="border-amber-100 bg-amber-50 p-5">
            <div className="flex gap-3">
              <Lightbulb className="size-6 shrink-0 text-amber-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Dica</h2>
                <p className="text-sm text-muted">Antes de abrir uma solicitação, consulte nossa central de ajuda. Você pode encontrar a resposta rapidamente.</p>
                <Link href="/ajuda" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Acessar ajuda <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex gap-3">
              <BookOpen className="size-6 shrink-0 text-blue-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Central de ajuda</h2>
                <p className="text-sm text-muted">Dúvidas frequentes e tutoriais.</p>
                <Link href="/ajuda" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Ver artigos <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex gap-3">
              <MessageCircle className="size-6 shrink-0 text-brand-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Fale com o RH</h2>
                <p className="text-sm text-muted">Não encontrou o que precisa? Fale diretamente com o RH.</p>
                <Link href="/fale-com-rh" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Enviar mensagem <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
