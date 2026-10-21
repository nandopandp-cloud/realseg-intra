import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Megaphone, Plus } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { AnnouncementStatusBadge } from "@/features/rh/announcements/status-badge";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { listHref } from "@/lib/url";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { ANNOUNCEMENT_TABS, announcementCategoryOptions, effectiveStatus, listAnnouncementsAdmin } from "@/server/services/rh/announcements";

export const metadata: Metadata = { title: "Comunicados · Gestão" };

const params = z.object({
  aba: z.enum(ANNOUNCEMENT_TABS).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
const TAB_LABEL = { todos: "Todos", publicados: "Publicados", agendados: "Agendados", rascunhos: "Rascunhos", arquivados: "Arquivados" } as const;

export default async function AdminAnnouncementsPage({ searchParams }: PageProps<"/rh/comunicados">) {
  const ctx = await requireRhCtx("announcement:manage");
  const sp = params.parse(await searchParams);
  const [list, categories] = await Promise.all([listAnnouncementsAdmin(ctx, { tab: sp.aba, q: sp.q, category: sp.categoria, page: sp.page }), announcementCategoryOptions()]);
  const canReport = can(ctx.actor, "announcement:report");
  const href = (patch: Record<string, string | number | undefined>) => listHref("/rh/comunicados", { aba: sp.aba, q: sp.q, categoria: sp.categoria, page: sp.page }, patch, { aba: "todos" });

  return (
    <AdminPage>
      <AdminPageHeader
        title="Comunicados"
        description="Publique avisos para toda a empresa ou para públicos específicos e acompanhe quem leu e confirmou ciência."
        actions={
          <ButtonLink href="/rh/comunicados/novo" icon={<Plus className="size-5" aria-hidden />}>
            Novo comunicado
          </ButtonLink>
        }
      />
      <Card className="p-4 sm:p-5">
        <LinkTabs label="Situação dos comunicados" size="sm" items={ANNOUNCEMENT_TABS.map((t) => ({ href: href({ aba: t }), label: TAB_LABEL[t], count: list.counts[t], active: sp.aba === t }))} />
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <SearchField label="Buscar comunicados" placeholder="Título ou resumo" defaultValue={sp.q} hidden={{ aba: sp.aba, categoria: sp.categoria }} className="md:max-w-md md:flex-1" />
          <FilterSelect name="categoria" label="Categoria" options={[{ value: "", label: "Todas as categorias" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} className="md:w-56" />
        </div>
        {list.items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={sp.q || sp.categoria ? "Nenhum comunicado encontrado" : "Nenhum comunicado nesta situação"}
            description="Crie um comunicado, defina o público e publique quando estiver pronto."
            action={<ButtonLink href="/rh/comunicados/novo">Novo comunicado</ButtonLink>}
            className="mt-6"
          />
        ) : (
          <>
            <Table caption="Comunicados" className="mt-4">
              <thead>
                <tr>
                  <Th>Comunicado</Th>
                  <Th>Situação</Th>
                  <Th>Publicação</Th>
                  <Th className="w-56">Leitura e ciência</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => {
                  const Icon = iconFor(a.category.icon);
                  const tone = toTone(a.category.color);
                  const st = effectiveStatus(a);
                  const base = a.requiresAck ? a.ackCount : a.readCount;
                  const pct = a.audienceSize ? Math.round((base / a.audienceSize) * 100) : 0;
                  return (
                    <Tr key={a.id}>
                      <Td className="min-w-[20rem]">
                        <div className="flex items-start gap-3">
                          <span className={cn("mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                            <Icon className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <Link href={`/rh/comunicados/${a.id}`} className="line-clamp-2 font-semibold hover:underline">
                              {a.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <span className="text-sm text-muted">{a.category.name}</span>
                              {a.isImportant && <Badge tone="red">Importante</Badge>}
                              {a.requiresAck && <Badge tone="amber">Exige ciência</Badge>}
                              {a.isFeatured && <Badge tone="purple">Destaque</Badge>}
                              {a.version > 1 && <Badge tone="slate">Versão {a.version}</Badge>}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <AnnouncementStatusBadge status={st} />
                      </Td>
                      <Td className="text-sm whitespace-nowrap text-muted">{a.publishedAt ? fmtDateTime(a.publishedAt) : "—"}</Td>
                      <Td>
                        {st === "published" ? (
                          canReport ? (
                            <Link href={`/rh/comunicados/${a.id}/leitura`} className="block rounded-lg hover:bg-canvas">
                              <ReadMeter value={pct} label={`${base} de ${a.audienceSize} ${a.requiresAck ? "confirmaram ciência" : "leram"}`} />
                            </Link>
                          ) : (
                            <ReadMeter value={pct} label={`${base} de ${a.audienceSize} ${a.requiresAck ? "confirmaram ciência" : "leram"}`} />
                          )
                        ) : (
                          <span className="text-sm text-muted">{a.audienceSize} no público</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <div className="mt-4">
              <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="comunicados" makeHref={(page) => href({ page })} />
            </div>
          </>
        )}
      </Card>
    </AdminPage>
  );
}

function ReadMeter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-sm text-ink">
        <strong>{value}%</strong> · {label}
      </p>
      <ProgressBar value={value} label={label} className="mt-1 h-1.5" tone={value < 50 ? "amber" : "brand"} />
    </div>
  );
}
