import type { Metadata } from "next";
import { Download, ScrollText } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { Button, buttonClasses } from "@/components/ui/button";
import { Pagination } from "@/components/ui/navigation";
import { Card, EmptyState } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { listHref } from "@/lib/url";
import { requireRhCtx } from "@/server/auth/rh";
import { AUDIT_GROUPS, listAudit, type AuditGroup } from "@/server/services/rh/audit-log";

export const metadata: Metadata = { title: "Auditoria · Gestão" };

const params = z.object({
  grupo: z.enum(Object.keys(AUDIT_GROUPS) as [AuditGroup, ...AuditGroup[]]).optional().catch(undefined),
  quem: z.string().max(100).optional().catch(undefined),
  id: z.string().max(80).optional().catch(undefined),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

/** Trilha de auditoria (somente leitura): quem fez o quê, quando e em qual requisição. Sem conteúdo sensível. */
export default async function AuditPage({ searchParams }: PageProps<"/rh/auditoria">) {
  const ctx = await requireRhCtx("audit:read");
  const sp = params.parse(await searchParams);
  const r = await listAudit(ctx, { group: sp.grupo, actor: sp.quem, entityId: sp.id, from: sp.de, to: sp.ate, page: sp.page });
  const filters = { grupo: sp.grupo, quem: sp.quem, id: sp.id, de: sp.de, ate: sp.ate };
  const exportHref = listHref("/api/v1/rh/audit/export", filters);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Auditoria"
        description="Registro de acessos e ações sensíveis. Os detalhes guardam apenas identificadores, nunca o conteúdo de documentos ou mensagens."
        actions={
          <a href={exportHref} className={buttonClasses("outline")}>
            <Download className="size-5" aria-hidden /> Exportar CSV
          </a>
        }
      />
      <Card className="p-4 sm:p-5">
        <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Tipo de ação
            <select name="grupo" defaultValue={sp.grupo ?? ""} className="min-h-12 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-base font-normal">
              <option value="">Todas</option>
              {(Object.keys(AUDIT_GROUPS) as AuditGroup[]).map((g) => (
                <option key={g} value={g}>
                  {AUDIT_GROUPS[g]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Quem
            <input name="quem" defaultValue={sp.quem} placeholder="Nome, e-mail ou matrícula" className="min-h-12 rounded-[var(--radius-control)] border border-line-strong px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            ID do registro
            <input name="id" defaultValue={sp.id} placeholder="Ex.: id do documento" className="min-h-12 rounded-[var(--radius-control)] border border-line-strong px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            De
            <input type="date" name="de" defaultValue={sp.de} className="min-h-12 rounded-[var(--radius-control)] border border-line-strong px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Até
            <input type="date" name="ate" defaultValue={sp.ate} className="min-h-12 rounded-[var(--radius-control)] border border-line-strong px-3 text-base font-normal" />
          </label>
          <Button type="submit">Filtrar</Button>
        </form>
        {r.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nenhum registro com esses filtros" className="mt-6" />
        ) : (
          <>
            <Table caption="Trilha de auditoria" className="mt-4">
              <thead>
                <tr>
                  <Th>Quando</Th>
                  <Th>Ação</Th>
                  <Th>Quem</Th>
                  <Th>Registro</Th>
                  <Th>Detalhes</Th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((i) => (
                  <Tr key={i.id}>
                    <Td className="text-sm whitespace-nowrap">{fmtDateTime(i.createdAt)}</Td>
                    <Td className="font-mono text-sm">{i.action}</Td>
                    <Td className="text-sm">
                      {i.actorName ?? "Sistema"}
                      {i.actorRegistration && <span className="block font-mono text-xs text-muted">{i.actorRegistration}</span>}
                    </Td>
                    <Td className="text-sm">
                      {i.entityType}
                      {i.entityId && <span className="block max-w-[12rem] truncate font-mono text-xs text-muted" title={i.entityId}>{i.entityId}</span>}
                    </Td>
                    <Td className="max-w-xs text-xs break-all text-muted">{i.metadata ? JSON.stringify(i.metadata) : "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4">
              <Pagination page={r.page} pageCount={r.pageCount} total={r.total} shown={r.items.length} noun="registros" makeHref={(page) => listHref("/rh/auditoria", { ...filters, page: sp.page }, { page })} />
            </div>
          </>
        )}
      </Card>
    </AdminPage>
  );
}
