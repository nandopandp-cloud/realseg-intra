import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Download, Eye, ShieldAlert } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { buttonClasses } from "@/components/ui/button";
import { FileIcon } from "@/components/ui/file-icon";
import { Alert, Avatar, Card } from "@/components/ui/primitives";
import { SubmissionReview } from "@/features/rh/documents/submission-review";
import { SubmissionStatusBadge, SUBMISSION_STATUS } from "@/features/tickets/status-badge";
import { fmtDate, fmtDateTime, fmtFileSize } from "@/lib/format";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { getSubmissionAdmin } from "@/server/services/rh/documents";

export const metadata: Metadata = { title: "Análise de envio · Gestão" };

export default async function SubmissionReviewPage({ params }: PageProps<"/rh/documentos/envios/[id]">) {
  const ctx = await requireRhCtx("submission:review");
  const { id } = await params;
  const s = await orNotFound(Promise.resolve().then(() => getSubmissionAdmin(ctx, parseId(id, "Envio"))));
  const fileHref = `/api/v1/rh/submissions/${s.id}/file`;
  const label = (st: string | null) => (st ? (SUBMISSION_STATUS[st]?.label ?? st) : "");

  return (
    <AdminPage>
      <AdminPageHeader
        title={s.title}
        crumbs={[{ label: "Documentos", href: "/rh/documentos" }]}
        eyebrow={
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-muted">DOC-{s.number}</span>
            <SubmissionStatusBadge status={s.status} />
          </div>
        }
        description={`${s.category.name} · enviado em ${fmtDateTime(s.createdAt)}${s.referenceDate ? ` · referente a ${fmtDate(s.referenceDate)}` : ""}`}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">Arquivo enviado</h2>
            {s.category.sensitive && (
              <Alert kind="warning" className="mt-3">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="size-4" aria-hidden /> Documento sensível: cada acesso fica registrado na auditoria.
                </span>
              </Alert>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-line p-4">
              <FileIcon mimeType={s.file.mimeType} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{s.file.name}</p>
                <p className="text-sm text-muted">
                  {fmtFileSize(s.file.sizeBytes)} · verificação: {s.file.scanStatus === "clean" ? "sem ameaças" : s.file.scanStatus === "skipped" ? "antivírus não configurado" : s.file.scanStatus}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={`${fileHref}?disposition=inline`} target="_blank" rel="noopener" className={buttonClasses("outline", "sm")}>
                  <Eye className="size-4" aria-hidden /> Visualizar
                </a>
                <a href={fileHref} className={buttonClasses("outline", "sm")}>
                  <Download className="size-4" aria-hidden /> Baixar
                </a>
              </div>
            </div>
            {s.notes && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-ink">Observações do colaborador</h3>
                <p className="mt-1 text-[0.9375rem] whitespace-pre-wrap text-ink">{s.notes}</p>
              </>
            )}
            {s.reviewNote && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-ink">Retorno do RH</h3>
                <p className="mt-1 text-[0.9375rem] whitespace-pre-wrap text-ink">{s.reviewNote}</p>
              </>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">Histórico</h2>
            <ol className="mt-3 flex flex-col gap-3 border-l border-line pl-4">
              {s.events.map((e, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-brand-500" aria-hidden />
                  <p className="text-ink">{e.fromStatus ? `${label(e.fromStatus)} → ${label(e.toStatus)}` : "Enviado pelo colaborador"}</p>
                  <p className="text-xs text-muted">
                    {fmtDateTime(e.createdAt)}
                    {e.actorName ? ` · ${e.actorName}` : ""}
                    {e.note ? ` · “${e.note}”` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Colaborador</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={s.employee.name} />
              <div>
                <p className="font-semibold text-ink">{s.employee.name}</p>
                <p className="font-mono text-xs text-muted">Matrícula {s.employee.registration}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Cargo</dt>
              <dd>{s.employee.position}</dd>
              <dt className="text-muted">Área</dt>
              <dd>{s.employee.department}</dd>
              <dt className="text-muted">Unidade</dt>
              <dd>{s.employee.unit}</dd>
            </dl>
            {s.others.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-ink">Outros envios</h3>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {s.others.map((o) => (
                    <li key={o.id}>
                      <Link href={`/rh/documentos/envios/${o.id}`} className="flex justify-between gap-2 text-sm hover:underline">
                        <span className="truncate">
                          <span className="font-mono text-muted">DOC-{o.number}</span> {o.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{label(o.status)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          {(s.status === "enviado" || s.status === "em_analise") && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Análise</h2>
              <SubmissionReview id={s.id} status={s.status} version={s.version} />
            </Card>
          )}
        </aside>
      </div>
    </AdminPage>
  );
}
