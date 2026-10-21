import type { Metadata } from "next";
import { CircleCheck, Download, Eye, UsersRound } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { listHref } from "@/lib/url";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { readingReport, REPORT_FILTERS } from "@/server/services/rh/announcements";

export const metadata: Metadata = { title: "Relatório de leitura · Gestão" };

const params = z.object({
  filtro: z.enum(REPORT_FILTERS).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

/** Quem do público leu e confirmou ciência da versão atual (pendentes primeiro). */
export default async function ReadingReportPage({ params: p, searchParams }: PageProps<"/rh/comunicados/[id]/leitura">) {
  const ctx = await requireRhCtx("announcement:report");
  const { id } = await p;
  const sp = params.parse(await searchParams);
  const r = await orNotFound(Promise.resolve().then(() => readingReport(ctx, parseId(id, "Comunicado"), { filter: sp.filtro, q: sp.q, page: sp.page })));
  const { audience, read, acknowledged } = r.totals;
  const pct = (n: number) => (audience ? Math.round((n / audience) * 100) : 0);
  const base = `/rh/comunicados/${id}/leitura`;
  const href = (patch: Record<string, string | number | undefined>) => listHref(base, { filtro: sp.filtro, q: sp.q, page: sp.page }, patch, { filtro: "todos" });
  const labels = { todos: "Todos", pendentes: r.announcement.requiresAck ? "Sem ciência" : "Não leram", lidos: "Leram", cientes: "Confirmaram ciência" } as const;
  const filters = REPORT_FILTERS.filter((f) => f !== "cientes" || r.announcement.requiresAck);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Relatório de leitura"
        crumbs={[
          { label: "Comunicados", href: "/rh/comunicados" },
          { label: r.announcement.title, href: `/rh/comunicados/${id}` },
        ]}
        description={`${r.announcement.title}${r.announcement.version > 1 ? ` · versão ${r.announcement.version} (leituras e ciências contam a partir desta versão)` : ""}`}
        actions={
          can(ctx.actor, "report:export") ? (
            <a href={`/api/v1/rh/announcements/${id}/report`} className={buttonClasses("outline")}>
              <Download className="size-5" aria-hidden /> Exportar CSV
            </a>
          ) : undefined
        }
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <li>
          <StatTile icon={UsersRound} tone="teal" label="Pessoas no público" value={audience} hint="Colaboradores com acesso" />
        </li>
        <li>
          <StatTile icon={Eye} tone="blue" label="Leram" value={`${pct(read)}%`} hint={`${read} de ${audience}`} />
        </li>
        {r.announcement.requiresAck && (
          <li>
            <StatTile icon={CircleCheck} tone="green" label="Confirmaram ciência" value={`${pct(acknowledged)}%`} hint={`${acknowledged} de ${audience} · ${audience - acknowledged} pendentes`} />
          </li>
        )}
      </ul>

      <Card className="mt-6 p-4 sm:p-5">
        <LinkTabs label="Filtrar colaboradores" size="sm" items={filters.map((f) => ({ href: href({ filtro: f }), label: labels[f], active: sp.filtro === f }))} />
        <SearchField label="Buscar no público" placeholder="Nome ou matrícula" defaultValue={sp.q} hidden={{ filtro: sp.filtro }} className="mt-4 md:max-w-md" />
        {r.items.length === 0 ? (
          <EmptyState icon={UsersRound} title="Ninguém nesta lista" description={sp.filtro === "pendentes" ? "Todo o público já está em dia com este comunicado." : "Ajuste o filtro ou a busca."} className="mt-6" />
        ) : (
          <>
            <Table caption="Colaboradores do público" className="mt-4">
              <thead>
                <tr>
                  <Th>Colaborador</Th>
                  <Th>Cargo</Th>
                  <Th>Unidade</Th>
                  <Th>Leitura</Th>
                  {r.announcement.requiresAck && <Th>Ciência</Th>}
                </tr>
              </thead>
              <tbody>
                {r.items.map((i) => (
                  <Tr key={i.employeeId}>
                    <Td>
                      <span className="block font-semibold">{i.name}</span>
                      <span className="block font-mono text-xs text-muted">Matrícula {i.registration}</span>
                    </Td>
                    <Td className="text-sm">
                      {i.position}
                      <span className="block text-muted">{i.department}</span>
                    </Td>
                    <Td className="text-sm">{i.unit}</Td>
                    <Td className="text-sm">{i.readAt ? fmtDateTime(i.readAt) : <Badge tone="amber">Não leu</Badge>}</Td>
                    {r.announcement.requiresAck && <Td className="text-sm">{i.acknowledgedAt ? fmtDateTime(i.acknowledgedAt) : <Badge tone="red">Pendente</Badge>}</Td>}
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4">
              <Pagination page={r.page} pageCount={r.pageCount} total={r.total} shown={r.items.length} noun="colaboradores" makeHref={(page) => href({ page })} />
            </div>
          </>
        )}
      </Card>
    </AdminPage>
  );
}
