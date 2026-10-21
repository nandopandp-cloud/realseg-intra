import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Inbox, MessagesSquare } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { AgentStatusBadge, PriorityBadge } from "@/features/rh/tickets/badges";
import { fmtRelative, fmtTicketNumber } from "@/lib/format";
import { listHref } from "@/lib/url";
import { TICKET_PRIORITIES } from "@/lib/validation/rh";
import { requireRhCtx } from "@/server/auth/rh";
import { listQueue, PRIORITY_LABEL, QUEUE_TABS } from "@/server/services/rh/tickets";
import { listTicketCategories } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Solicitações · Gestão" };

const params = z.object({
  aba: z.enum(QUEUE_TABS).catch("abertas"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  prioridade: z.enum(TICKET_PRIORITIES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

const TAB_LABEL: Record<(typeof QUEUE_TABS)[number], string> = {
  abertas: "Abertas",
  "sem-responsavel": "Sem responsável",
  minhas: "Comigo",
  aguardando: "Aguardando colaborador",
  atrasadas: "Fora do prazo",
  concluidas: "Concluídas",
};
const COUNT_KEY = { abertas: "abertas", "sem-responsavel": "semResponsavel", minhas: "minhas", aguardando: "aguardando", atrasadas: "atrasadas", concluidas: "concluidas" } as const;

/** Fila de atendimento: todas as solicitações dos colaboradores, priorizadas por urgência e prazo. */
export default async function QueuePage({ searchParams }: PageProps<"/rh/solicitacoes">) {
  const ctx = await requireRhCtx("ticket:read:any");
  const sp = params.parse(await searchParams);
  const [list, categories] = await Promise.all([
    listQueue(ctx, { tab: sp.aba, q: sp.q, category: sp.categoria, priority: sp.prioridade, page: sp.page }),
    listTicketCategories(),
  ]);
  const current = { aba: sp.aba, q: sp.q, categoria: sp.categoria, prioridade: sp.prioridade, page: sp.page };
  const href = (patch: Record<string, string | number | undefined>) => listHref("/rh/solicitacoes", current, patch, { aba: "abertas" });

  return (
    <AdminPage>
      <AdminPageHeader title="Solicitações" description="Atenda os pedidos dos colaboradores dentro do prazo. As mais urgentes aparecem primeiro." />

      <Card className="p-4 sm:p-5">
        <LinkTabs
          label="Situação das solicitações"
          size="sm"
          items={QUEUE_TABS.map((t) => ({ href: href({ aba: t }), label: TAB_LABEL[t], count: list.counts[COUNT_KEY[t]], active: sp.aba === t }))}
        />
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <SearchField label="Buscar solicitações" placeholder="Protocolo, assunto, nome ou matrícula" defaultValue={sp.q} hidden={{ aba: sp.aba, categoria: sp.categoria, prioridade: sp.prioridade }} className="md:max-w-md md:flex-1" />
          <FilterSelect name="categoria" label="Área" options={[{ value: "", label: "Todas as áreas" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} className="md:w-48" />
          <FilterSelect name="prioridade" label="Prioridade" options={[{ value: "", label: "Todas as prioridades" }, ...TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))]} className="md:w-52" />
        </div>

        {list.items.length === 0 ? (
          <EmptyState
            icon={sp.aba === "concluidas" ? Inbox : MessagesSquare}
            title={sp.q || sp.categoria || sp.prioridade ? "Nenhuma solicitação encontrada com esses filtros" : "Nada por aqui"}
            description={sp.aba === "abertas" ? "Quando um colaborador abrir uma solicitação, ela aparece nesta fila." : "Experimente outra aba ou limpe os filtros."}
            className="mt-6"
          />
        ) : (
          <>
            <Table caption="Fila de solicitações" className="mt-4">
              <thead>
                <tr>
                  <Th>Protocolo</Th>
                  <Th>Solicitação</Th>
                  <Th>Colaborador</Th>
                  <Th>Prioridade</Th>
                  <Th>Situação</Th>
                  <Th>Responsável</Th>
                  <Th className="w-44">Prazo</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-mono text-sm whitespace-nowrap">
                      <Link href={`/rh/solicitacoes/${t.number}`} className="font-semibold text-brand-700 hover:underline">
                        {fmtTicketNumber(t.number)}
                      </Link>
                    </Td>
                    <Td className="min-w-[16rem]">
                      <Link href={`/rh/solicitacoes/${t.number}`} className="line-clamp-2 font-semibold hover:underline">
                        {t.subject}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                        {t.category.name} · atualizada {fmtRelative(t.updatedAt)}
                        {t.channel === "chat" && <Badge tone="indigo">Chat</Badge>}
                      </span>
                    </Td>
                    <Td>
                      <span className="block whitespace-nowrap">{t.requester.name}</span>
                      <span className="block font-mono text-xs text-muted">Matrícula {t.requester.registration}</span>
                    </Td>
                    <Td>
                      <PriorityBadge priority={t.priority} />
                    </Td>
                    <Td>
                      <AgentStatusBadge status={t.status} />
                    </Td>
                    <Td className="text-sm whitespace-nowrap">{t.assigneeName ?? t.assigneeEmail ?? <span className="font-semibold text-amber-700">Sem responsável</span>}</Td>
                    <Td>
                      <SlaMeter sla={t.sla} compact />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4">
              <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="solicitações" makeHref={(page) => href({ page })} />
            </div>
          </>
        )}
      </Card>
    </AdminPage>
  );
}
