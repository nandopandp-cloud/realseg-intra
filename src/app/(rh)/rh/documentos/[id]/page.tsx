import type { Metadata } from "next";
import { CircleCheck, Download, Eye } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Avatar, Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { DocumentManage } from "@/features/rh/documents/document-forms";
import { fmtDate, fmtDateTime, fmtFileSize } from "@/lib/format";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { getDocumentAdmin, periodLabel } from "@/server/services/rh/documents";

export const metadata: Metadata = { title: "Documento · Gestão" };

export default async function AdminDocumentPage({ params }: PageProps<"/rh/documentos/[id]">) {
  const ctx = await requireRhCtx("document:read:any");
  const { id } = await params;
  const d = await orNotFound(Promise.resolve().then(() => getDocumentAdmin(ctx, parseId(id, "Documento"))));
  const personal = d.scope === "personal";
  const pct = d.ack.audience ? Math.round((d.ack.count / d.ack.audience) * 100) : 0;

  return (
    <AdminPage>
      <AdminPageHeader
        title={d.title}
        crumbs={[{ label: "Documentos", href: `/rh/documentos?aba=${personal ? "pessoais" : "normas"}` }]}
        eyebrow={
          <div className="flex flex-wrap gap-2">
            <Badge tone={personal ? "indigo" : "slate"}>{personal ? "Documento pessoal" : "Norma / manual"}</Badge>
            {d.status === "archived" && <Badge tone="slate">Arquivado</Badge>}
            {d.category.sensitive && <Badge tone="amber">Sensível</Badge>}
          </div>
        }
        description={`${d.category.name}${d.referencePeriod ? ` · ${periodLabel(d.referencePeriod)}` : ""} · criado em ${fmtDateTime(d.createdAt)}`}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">Versões</h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {d.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      Versão {v.versionNumber}
                      {v.id === d.currentVersionId && <Badge tone="green" className="ml-2">Atual</Badge>}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {v.fileName} · {fmtFileSize(v.sizeBytes)} · {fmtDateTime(v.createdAt)}
                      {v.changeNote ? ` · “${v.changeNote}”` : ""}
                    </span>
                  </span>
                  <a href={`/api/v1/rh/documents/${d.id}/versions/${v.id}?disposition=inline`} target="_blank" rel="noopener" className={buttonClasses("ghost", "sm")}>
                    <Eye className="size-4" aria-hidden /> Visualizar
                  </a>
                  <a href={`/api/v1/rh/documents/${d.id}/versions/${v.id}`} className={buttonClasses("ghost", "sm")}>
                    <Download className="size-4" aria-hidden /> Baixar
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          {d.canManage && (
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-bold text-ink">Gerenciar</h2>
              <DocumentManage
                id={d.id}
                scope={d.scope}
                status={d.status}
                meta={{ title: d.title, description: d.description, referencePeriod: d.referencePeriod, requiresAck: d.requiresAck, effectiveFrom: d.effectiveFrom, effectiveUntil: d.effectiveUntil }}
              />
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-6">
          {d.owner && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Destinatário</h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={d.owner.name} />
                <div>
                  <p className="font-semibold text-ink">{d.owner.name}</p>
                  <p className="font-mono text-xs text-muted">Matrícula {d.owner.registration}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">Área</dt>
                <dd>{d.owner.department}</dd>
                <dt className="text-muted">Unidade</dt>
                <dd>{d.owner.unit}</dd>
                <dt className="text-muted">Primeiro acesso</dt>
                <dd>{d.ownerFirstAccess ? fmtDateTime(d.ownerFirstAccess) : "Ainda não abriu"}</dd>
                {d.requiresAck && (
                  <>
                    <dt className="text-muted">Ciência</dt>
                    <dd>{d.ack.ownerAckAt ? <span className="inline-flex items-center gap-1 text-green-700"><CircleCheck className="size-4" aria-hidden /> {fmtDateTime(d.ack.ownerAckAt)}</span> : <Badge tone="amber">Pendente</Badge>}</dd>
                  </>
                )}
              </dl>
            </Card>
          )}
          {!personal && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Vigência e ciência</h2>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">Desde</dt>
                <dd>{d.effectiveFrom ? fmtDate(d.effectiveFrom) : "—"}</dd>
                <dt className="text-muted">Até</dt>
                <dd>{d.effectiveUntil ? fmtDate(d.effectiveUntil) : "Sem prazo"}</dd>
              </dl>
              {d.requiresAck ? (
                <div className="mt-4">
                  <p className="text-sm">
                    <strong>{pct}%</strong> confirmaram a versão atual ({d.ack.count} de {d.ack.audience})
                  </p>
                  <ProgressBar value={pct} label={`${d.ack.count} de ${d.ack.audience} confirmaram ciência`} className="mt-1.5" />
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Não exige confirmação de ciência.</p>
              )}
            </Card>
          )}
        </aside>
      </div>
    </AdminPage>
  );
}
