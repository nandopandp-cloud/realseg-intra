import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { FileSpreadsheet, UserPlus, UsersRound } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { fmtDate, fmtRelative } from "@/lib/format";
import { listHref } from "@/lib/url";
import { can } from "@/server/auth/actor";
import { ROLE_LABELS, type RoleKey } from "@/server/auth/permissions";
import { requireRhCtx } from "@/server/auth/rh";
import { listEmployees } from "@/server/services/rh/employees";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Colaboradores · Gestão" };

const params = z.object({
  situacao: z.enum(["todos", "ativo", "afastado", "desligado"]).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  area: z.uuid().optional().catch(undefined),
  unidade: z.uuid().optional().catch(undefined),
  cargo: z.uuid().optional().catch(undefined),
  papel: z.enum(["RH", "GESTOR", "ADMIN"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
const TABS = { todos: "Ativos e afastados", ativo: "Ativos", afastado: "Afastados", desligado: "Desligados" } as const;
const STATUS_TONE = { ativo: "green", afastado: "amber", desligado: "slate" } as const;

export default async function EmployeesPage({ searchParams }: PageProps<"/rh/colaboradores">) {
  const ctx = await requireRhCtx("employee:read:any");
  const sp = params.parse(await searchParams);
  const [list, org] = await Promise.all([listEmployees(ctx, { q: sp.q, status: sp.situacao, department: sp.area, unit: sp.unidade, position: sp.cargo, role: sp.papel, page: sp.page }), orgOptions(ctx)]);
  const canManage = can(ctx.actor, "employee:manage");
  const href = (patch: Record<string, string | number | undefined>) => listHref("/rh/colaboradores", sp, patch, { situacao: "todos" });

  return (
    <AdminPage>
      <AdminPageHeader
        title="Colaboradores"
        description="Cadastro, vínculo e acesso de cada pessoa à intranet."
        actions={
          canManage ? (
            <>
              <ButtonLink href="/rh/colaboradores/importar" variant="outline" icon={<FileSpreadsheet className="size-5" aria-hidden />}>
                Importar planilha
              </ButtonLink>
              <ButtonLink href="/rh/colaboradores/novo" icon={<UserPlus className="size-5" aria-hidden />}>
                Cadastrar
              </ButtonLink>
            </>
          ) : undefined
        }
      />
      <Card className="p-4 sm:p-5">
        <LinkTabs label="Situação" size="sm" items={(Object.keys(TABS) as Array<keyof typeof TABS>).map((k) => ({ href: href({ situacao: k }), label: TABS[k], count: list.counts[k], active: sp.situacao === k }))} />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
          <SearchField label="Buscar colaboradores" placeholder="Nome, e-mail ou matrícula" defaultValue={sp.q} hidden={{ situacao: sp.situacao, area: sp.area, unidade: sp.unidade, cargo: sp.cargo, papel: sp.papel }} />
          <FilterSelect name="area" label="Área" options={[{ value: "", label: "Todas as áreas" }, ...org.departments.map((d) => ({ value: d.id, label: d.name }))]} />
          <FilterSelect name="unidade" label="Unidade" options={[{ value: "", label: "Todas as unidades" }, ...org.units.map((u) => ({ value: u.id, label: u.name }))]} />
          <FilterSelect name="cargo" label="Cargo" options={[{ value: "", label: "Todos os cargos" }, ...org.positions.map((p) => ({ value: p.id, label: p.name }))]} />
          <FilterSelect name="papel" label="Papel" options={[{ value: "", label: "Todos os papéis" }, { value: "RH", label: "RH" }, { value: "GESTOR", label: "Gestor" }, { value: "ADMIN", label: "Administrador" }]} />
        </div>
        {list.items.length === 0 ? (
          <EmptyState icon={UsersRound} title="Nenhum colaborador encontrado" description="Ajuste a busca ou os filtros." className="mt-6" />
        ) : (
          <>
            <Table caption="Colaboradores" className="mt-4">
              <thead>
                <tr>
                  <Th>Colaborador</Th>
                  <Th>Cargo</Th>
                  <Th>Área e unidade</Th>
                  <Th>Admissão</Th>
                  <Th>Último acesso</Th>
                  <Th>Situação</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((e) => (
                  <Tr key={e.id}>
                    <Td className="min-w-[16rem]">
                      <Link href={`/rh/colaboradores/${e.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar name={e.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block font-semibold">{e.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {e.registration} · {e.email}
                          </span>
                        </span>
                      </Link>
                      {(e.roles as string[]).some((r) => r !== "COLABORADOR") && (
                        <span className="mt-1 ml-11 flex gap-1">
                          {(e.roles as RoleKey[])
                            .filter((r) => r !== "COLABORADOR")
                            .map((r) => (
                              <Badge key={r} tone="indigo">
                                {ROLE_LABELS[r]}
                              </Badge>
                            ))}
                        </span>
                      )}
                    </Td>
                    <Td className="text-sm">{e.position}</Td>
                    <Td className="text-sm">
                      {e.department}
                      <span className="block text-muted">{e.unit}</span>
                    </Td>
                    <Td className="text-sm whitespace-nowrap">{fmtDate(e.admissionDate)}</Td>
                    <Td className="text-sm whitespace-nowrap text-muted">{e.lastLoginAt ? fmtRelative(e.lastLoginAt) : "Nunca entrou"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[e.status]}>{e.status === "ativo" ? "Ativo" : e.status === "afastado" ? "Afastado" : "Desligado"}</Badge>
                      {e.lockedUntil && e.lockedUntil > new Date() && (
                        <Badge tone="red" className="ml-1">
                          Bloqueado
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4">
              <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="colaboradores" makeHref={(page) => href({ page })} />
            </div>
          </>
        )}
      </Card>
    </AdminPage>
  );
}
