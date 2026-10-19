import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/app-link";
import { ArrowRight, MessageSquareMore, Megaphone, X } from "lucide-react";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { AnnouncementCard } from "@/features/announcements/announcement-card";
import { fmtDay, fmtMonthShort } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { featuredAnnouncement, listAnnouncements, listCategories, upcomingEvents, type AnnouncementTab } from "@/server/services/announcements";
import { z } from "zod";

export const metadata: Metadata = { title: "Comunicados" };

const params = z.object({
  aba: z.enum(["todos", "importantes", "nao-lidos", "favoritos"]).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  tag: z.string().max(40).optional().catch(undefined),
  ordem: z.enum(["recentes", "antigos"]).catch("recentes"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export default async function AnnouncementsPage({ searchParams }: PageProps<"/comunicados">) {
  const ctx = await requireCtx();
  const sp = params.parse(await searchParams);
  const [list, featured, events, categories] = await Promise.all([
    listAnnouncements(ctx, { tab: sp.aba as AnnouncementTab, q: sp.q, category: sp.categoria, tag: sp.tag, sort: sp.ordem, page: sp.page }),
    featuredAnnouncement(ctx),
    upcomingEvents(ctx),
    listCategories(),
  ]);
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { aba: sp.aba, q: sp.q, categoria: sp.categoria, tag: sp.tag, ordem: sp.ordem, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "aba" && v === "todos") && !(k === "ordem" && v === "recentes") && !(k === "page" && String(v) === "1")) p.set(k, String(v));
    return `/comunicados${p.size ? `?${p}` : ""}`;
  };
  const tabs = [
    { key: "todos", label: "Todos", count: list.counts.todos },
    { key: "importantes", label: "Importantes", count: list.counts.importantes },
    { key: "nao-lidos", label: "Não lidos", badge: list.counts.naoLidos },
    { key: "favoritos", label: "Favoritos", count: list.counts.favoritos },
  ];

  return (
    <>
      <PageHero
        eyebrow="Comunicação"
        title="Comunicados"
        subtitle="Fique por dentro das novidades, avisos e informações importantes da REALSEG."
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Comunicados" }]}
        image="/images/hero-comunicados.webp"
        mobileImage="/images/mhero-comunicados.webp"
      />
      <PageBody>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <LinkTabs
            label="Filtrar comunicados"
            className="lg:flex-1"
            items={tabs.map((t) => ({ href: href({ aba: t.key }), label: t.label, count: t.count, badge: t.badge, active: sp.aba === t.key }))}
          />
          <div className="flex gap-2 lg:pb-2">
            <SearchField label="Buscar comunicados" placeholder="Buscar comunicado..." defaultValue={sp.q} hidden={{ aba: sp.aba === "todos" ? undefined : sp.aba, categoria: sp.categoria, tag: sp.tag, ordem: sp.ordem === "recentes" ? undefined : sp.ordem }} className="flex-1 lg:w-56" />
            <FilterSelect name="categoria" label="Categoria" options={[{ value: "", label: "Todas" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} className="w-32 lg:w-36" />
            <FilterSelect name="ordem" label="Ordenar" options={[{ value: "", label: "Mais recentes" }, { value: "antigos", label: "Mais antigos" }]} className="hidden w-40 sm:block" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21.5rem]">
          <section aria-label="Lista de comunicados">
            {sp.tag && (
              <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                Tag:
                <Link href={href({ tag: undefined })} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-50 px-3 font-medium text-brand-700 hover:bg-brand-100">
                  {sp.tag} <X className="size-4" aria-hidden />
                  <span className="sr-only">(remover filtro)</span>
                </Link>
              </p>
            )}
            {list.items.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={sp.q ? "Nenhum comunicado encontrado" : sp.aba === "nao-lidos" ? "Você está em dia!" : sp.aba === "favoritos" ? "Nenhum favorito ainda" : "Nenhum comunicado por aqui"}
                description={
                  sp.q
                    ? "Tente outras palavras ou limpe os filtros."
                    : sp.aba === "nao-lidos"
                      ? "Todos os comunicados já foram lidos."
                      : sp.aba === "favoritos"
                        ? "Abra um comunicado e toque em “Favoritar” para guardá-lo aqui."
                        : "Novos comunicados aparecerão aqui."
                }
                action={sp.q || sp.categoria || sp.tag ? <ButtonLink href="/comunicados" variant="outline">Limpar filtros</ButtonLink> : undefined}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {list.items.map((a) => (
                  <li key={a.id}>
                    <AnnouncementCard a={a} />
                  </li>
                ))}
              </ul>
            )}
            {list.total > 0 && (
              <div className="mt-5">
                <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="comunicados" makeHref={(p) => href({ page: p })} />
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-5" aria-label="Destaques e agenda">
            {featured && (
              <Card className="p-4">
                <h2 className="mb-3 text-lg font-bold text-ink">Destaque da semana</h2>
                <div className="relative overflow-hidden rounded-xl bg-navy-950 p-5 text-white">
                  <Image src="/images/destaque-guard.webp" alt="" width={130} height={172} className="pointer-events-none absolute right-0 bottom-0 h-full w-auto object-cover opacity-90" aria-hidden />
                  <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-transparent" aria-hidden />
                  <div className="relative max-w-[70%]">
                    <p className="text-xl leading-tight font-bold">{featured.title}</p>
                    <p className="mt-2 text-sm text-on-dark">{featured.summary}</p>
                    <Link href={`/comunicados/${featured.id}`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-700 px-3.5 text-sm font-semibold text-white hover:bg-brand-800">
                      Saiba mais <ArrowRight className="size-4" aria-hidden />
                      <span className="sr-only">sobre {featured.title}</span>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
            <Card className="p-4">
              <SectionHeader title="Próximos eventos" as="h2" className="mb-1 [&_h2]:text-lg" />
              {events.length === 0 ? (
                <p className="py-3 text-[0.9375rem] text-muted">Nenhum evento agendado para a sua unidade.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {events.map((ev, i) => (
                    <li key={ev.id} className="flex gap-3 py-3">
                      <span className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 ${i === 2 ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>
                        <span className="text-xl leading-none font-bold">{fmtDay(ev.startsAt)}</span>
                        <span className="text-xs font-semibold">{fmtMonthShort(ev.startsAt)}</span>
                      </span>
                      <span className="min-w-0">
                        {ev.announcementId ? (
                          <Link href={`/comunicados/${ev.announcementId}`} className="font-semibold text-ink hover:underline">
                            {ev.title}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink">{ev.title}</span>
                        )}
                        {ev.description && <span className="block text-sm text-muted">{ev.description}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="border-brand-100 bg-brand-50 p-4">
              <h2 className="text-lg font-bold text-ink">Canais de comunicação</h2>
              <div className="mt-3 flex gap-3">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600" aria-hidden>
                  <MessageSquareMore className="size-6" />
                </span>
                <div>
                  <p className="text-[0.9375rem] text-muted">Tem alguma sugestão, dúvida ou precisa falar com o RH?</p>
                  <ButtonLink href="/solicitacoes/nova?categoria=rh" variant="outline" size="sm" className="mt-3 border-brand-200 bg-surface text-brand-700" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                    Enviar mensagem
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
