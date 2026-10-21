import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { FileUp, MessageSquareHeart } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { rhHref } from "@/components/layout/rh-nav";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { AccessPanel } from "@/features/rh/employees/access-panel";
import { EmployeeForm } from "@/features/rh/employees/employee-form";
import { fmtDate, fmtTicketNumber } from "@/lib/format";
import { can } from "@/server/auth/actor";
import { ROLE_LABELS } from "@/server/auth/permissions";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { EMPLOYEE_STATUS_LABEL, getEmployee } from "@/server/services/rh/employees";
import { orgOptions } from "@/server/services/rh/org";
import { AGENT_STATUS_LABEL } from "@/server/services/rh/tickets";

export const metadata: Metadata = { title: "Colaborador · Gestão" };

export default async function EmployeePage({ params }: PageProps<"/rh/colaboradores/[id]">) {
  const ctx = await requireRhCtx("employee:read:any");
  const { id } = await params;
  const e = await orNotFound(Promise.resolve().then(() => getEmployee(ctx, parseId(id, "Colaborador"))));
  const org = e.canManage ? await orgOptions(ctx) : null;
  const tone = e.status === "ativo" ? "green" : e.status === "afastado" ? "amber" : "slate";

  return (
    <AdminPage>
      <AdminPageHeader
        title={e.fullName}
        crumbs={[{ label: "Colaboradores", href: "/rh/colaboradores" }]}
        eyebrow={
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={tone}>{EMPLOYEE_STATUS_LABEL[e.status]}</Badge>
            {e.roles
              .filter((r) => r !== "COLABORADOR")
              .map((r) => (
                <Badge key={r} tone="indigo">
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
          </div>
        }
        description={`Matrícula ${e.registrationNumber} · ${e.position} (${e.family} · ${e.positionLevel}) · ${e.department} · ${e.unit}`}
        actions={
          <>
            {can(ctx.actor, "document:manage") && (
              <ButtonLink href="/rh/documentos/distribuir" variant="outline" icon={<FileUp className="size-5" aria-hidden />}>
                Enviar documento
              </ButtonLink>
            )}
            {rhHref("/rh/feedbacks/novo") && can(ctx.actor, "feedback:write:any") && (
              <ButtonLink href={`/rh/feedbacks/novo?colaborador=${e.id}`} variant="outline" icon={<MessageSquareHeart className="size-5" aria-hidden />}>
                Registrar feedback
              </ButtonLink>
            )}
          </>
        }
      />
      <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Documentos", value: e.stats.documents },
          { label: "Solicitações abertas", value: e.stats.openTickets },
          { label: "Cursos concluídos", value: e.stats.coursesDone },
          { label: "Cursos em andamento", value: e.stats.coursesOpen },
          { label: "Feedbacks", value: e.stats.feedbacks },
        ].map((s) => (
          <li key={s.label} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p className="text-2xl font-bold text-ink tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {org ? (
            <EmployeeForm
              id={e.id}
              org={org}
              initial={{
                fullName: e.fullName,
                preferredName: e.preferredName ?? "",
                registrationNumber: e.registrationNumber,
                email: e.user.email,
                departmentId: e.departmentId,
                unitId: e.unitId,
                jobPositionId: e.jobPositionId,
                manager: e.manager ? { id: e.manager.id, name: e.manager.name, registration: "" } : null,
                admissionDate: e.admissionDate,
              }}
            />
          ) : (
            <Card className="p-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
                <dt className="text-muted">E-mail</dt>
                <dd>{e.user.email}</dd>
                <dt className="text-muted">Admissão</dt>
                <dd>{fmtDate(e.admissionDate)}</dd>
                <dt className="text-muted">Gestor</dt>
                <dd>{e.manager?.name ?? "—"}</dd>
              </dl>
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Acesso à intranet</h2>
            <AccessPanel
              id={e.id}
              name={e.fullName}
              status={e.status}
              roles={e.roles}
              locked={e.locked}
              lastLoginAt={e.user.lastLoginAt}
              mustChangePassword={e.user.mustChangePassword}
              activeSessions={e.activeSessions}
              canManage={e.canManage}
              canManageRoles={e.canManageRoles}
            />
          </Card>
          {e.team.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Equipe ({e.team.length})</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {e.team.map((m) => (
                  <li key={m.id}>
                    <Link href={`/rh/colaboradores/${m.id}`} className="flex items-center gap-2 text-sm hover:underline">
                      <Avatar name={m.name} size="sm" /> {m.name}
                      {m.status !== "ativo" && <Badge tone="slate">{EMPLOYEE_STATUS_LABEL[m.status]}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {e.recentTickets.length > 0 && can(ctx.actor, "ticket:read:any") && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Solicitações recentes</h2>
              <ul className="mt-3 flex flex-col gap-1.5">
                {e.recentTickets.map((t) => (
                  <li key={t.number}>
                    <Link href={`/rh/solicitacoes/${t.number}`} className="flex justify-between gap-2 text-sm hover:underline">
                      <span className="truncate">
                        <span className="font-mono text-muted">{fmtTicketNumber(t.number)}</span> {t.subject}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{AGENT_STATUS_LABEL[t.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </AdminPage>
  );
}
