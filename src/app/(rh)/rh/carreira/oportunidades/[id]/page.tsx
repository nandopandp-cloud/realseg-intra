import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { UsersRound } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ApplicationActions, OpportunityForm, OpportunityStatusActions } from "@/features/rh/career/career-forms";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { getOpportunityAdmin } from "@/server/services/rh/career";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Oportunidade · Gestão" };

const APP = { enviada: { tone: "amber", label: "Nova" }, em_analise: { tone: "blue", label: "Em análise" }, encerrada: { tone: "slate", label: "Encerrada" }, retirada: { tone: "slate", label: "Retirada" } } as const;

export default async function OpportunityPage({ params }: PageProps<"/rh/carreira/oportunidades/[id]">) {
  const ctx = await requireRhCtx("career:manage");
  const { id } = await params;
  const o = await orNotFound(Promise.resolve().then(() => getOpportunityAdmin(ctx, parseId(id, "Oportunidade"))));
  const org = await orgOptions(ctx);
  const status = o.status === "draft" ? { tone: "slate", label: "Rascunho" } : o.open ? { tone: "green", label: "Inscrições abertas" } : { tone: "slate", label: "Encerrada" };

  return (
    <AdminPage>
      <AdminPageHeader
        title={o.title}
        crumbs={[{ label: "Carreira", href: "/rh/carreira" }]}
        eyebrow={<Badge tone={status.tone as "slate" | "green"}>{status.label}</Badge>}
        description={`${o.publishedAt ? `Publicada em ${fmtDate(o.publishedAt)} · ` : ""}${o.closesAt ? `inscrições até ${fmtDate(o.closesAt)} · ` : ""}Quem pode se candidatar: ${o.eligibilityLabels.join(", ")}`}
        actions={<OpportunityStatusActions id={o.id} status={o.status} open={o.open} />}
      />
      <Card className="mb-6 p-4 sm:p-5" aria-labelledby="candidaturas">
        <h2 id="candidaturas" className="text-lg font-bold text-ink">
          Candidaturas ({o.applications.length})
        </h2>
        {o.applications.length === 0 ? (
          <EmptyState icon={UsersRound} title="Nenhuma candidatura ainda" className="mt-3" />
        ) : (
          <Table caption="Candidaturas" className="mt-3">
            <thead>
              <tr>
                <Th>Colaborador</Th>
                <Th>Mensagem</Th>
                <Th>Enviada em</Th>
                <Th>Situação</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {o.applications.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <Link href={`/rh/colaboradores/${a.employee.id}`} className="font-semibold hover:underline">
                      {a.employee.name}
                    </Link>
                    <span className="block text-sm text-muted">
                      {a.employee.position} · {a.employee.unit} · desde {fmtDate(a.employee.admissionDate)}
                    </span>
                  </Td>
                  <Td className="max-w-xs text-sm">{a.message ?? <span className="text-muted">—</span>}</Td>
                  <Td className="text-sm whitespace-nowrap">{fmtDateTime(a.createdAt)}</Td>
                  <Td>
                    <Badge tone={APP[a.status].tone}>{APP[a.status].label}</Badge>
                  </Td>
                  <Td>
                    <ApplicationActions id={a.id} status={a.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <OpportunityForm
        key={o.updatedAt.toISOString()}
        id={o.id}
        org={org}
        initial={{
          title: o.title,
          areaLabel: o.areaLabel,
          description: o.description,
          requirements: o.requirements,
          jobPositionId: o.jobPositionId ?? "",
          departmentId: o.departmentId ?? "",
          unitId: o.unitId ?? "",
          isHighlighted: o.isHighlighted,
          closesAt: o.closesAt ? new Date(o.closesAt.getTime() - 3 * 3600_000).toISOString().slice(0, 10) : "",
          eligibility: o.eligibility,
        }}
      />
    </AdminPage>
  );
}
