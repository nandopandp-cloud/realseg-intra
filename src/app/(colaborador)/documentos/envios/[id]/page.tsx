import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Alert, Breadcrumbs, Card } from "@/components/ui/primitives";
import { CancelSubmissionButton } from "@/features/documents/cancel-submission";
import { SUBMISSION_STATUS, SubmissionStatusBadge } from "@/features/tickets/status-badge";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateTime, fmtFileSize } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { getMySubmission } from "@/server/services/documents";

export const metadata: Metadata = { title: "Envio de documento" };

export default async function SubmissionPage({ params }: PageProps<"/documentos/envios/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const s = await orNotFound(getMySubmission(ctx, id));
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Documentos", href: "/documentos" }, { label: "Enviar documento", href: "/documentos/enviar" }, { label: s.title }]} />
      <Link href="/documentos/enviar" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Meus envios
      </Link>
      <p className="eyebrow mt-2 lg:mt-6">Protocolo DOC-{s.number}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight text-ink">{s.title}</h1>
        <SubmissionStatusBadge status={s.status} />
      </div>
      {s.status === "recusado" && s.reviewNote && (
        <Alert kind="error" title="Documento recusado pelo RH" className="mt-5">
          Motivo: {s.reviewNote}{" "}
          <Link href="/documentos/enviar" className="font-semibold underline">
            Enviar novamente
          </Link>
        </Alert>
      )}
      {s.status === "aceito" && <Alert kind="success" title="Documento aceito" className="mt-5">O RH validou o seu documento.</Alert>}
      <Card className="mt-5 p-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
          <div>
            <dt className="text-muted">Tipo</dt>
            <dd className="font-semibold text-ink">{s.category?.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Enviado em</dt>
            <dd className="font-semibold text-ink">{fmtDateTime(s.createdAt)}</dd>
          </div>
          {s.referenceDate && (
            <div>
              <dt className="text-muted">Data de referência</dt>
              <dd className="font-semibold text-ink">{fmtDate(s.referenceDate + "T12:00:00Z")}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Arquivo</dt>
            <dd className="font-semibold break-all text-ink">
              {s.file?.name} • {s.file ? fmtFileSize(s.file.sizeBytes) : ""}
            </dd>
          </div>
          {s.notes && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Observações</dt>
              <dd className="text-ink">{s.notes}</dd>
            </div>
          )}
        </dl>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a href={`/api/v1/submissions/${s.id}/file?disposition=attachment`} className={buttonClasses("outline", "md")}>
            <Download className="size-5" aria-hidden /> Baixar arquivo enviado
          </a>
          {s.status === "enviado" && <CancelSubmissionButton id={s.id} />}
        </div>
      </Card>
      <section aria-labelledby="andamento" className="mt-8">
        <h2 id="andamento" className="text-lg font-bold text-ink">
          Andamento
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {s.events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", i === s.events.length - 1 ? "bg-brand-600" : "bg-line-strong")} aria-hidden />
              <div>
                <p className="font-semibold text-ink">{SUBMISSION_STATUS[e.toStatus]?.label ?? e.toStatus}</p>
                {e.note && <p className="text-[0.9375rem] text-muted">{e.note}</p>}
                <p className="text-sm text-muted">{fmtDateTime(e.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
