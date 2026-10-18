import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { FileIcon } from "@/components/ui/file-icon";
import { Breadcrumbs, Card } from "@/components/ui/primitives";
import { AcknowledgeBox } from "@/features/announcements/actions";
import { DocCategoryBadge } from "@/features/documents/category-badge";
import { fmtDate, fmtDateTime, fmtFileSize } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { getDocument } from "@/server/services/documents";

export const metadata: Metadata = { title: "Documento" };

const ACTION_LABEL: Record<string, string> = { "document.downloaded": "Você baixou", "document.viewed": "Você visualizou", "document.acknowledged": "Você confirmou ciência" };

export default async function DocumentPage({ params }: PageProps<"/documentos/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const d = await orNotFound(getDocument(ctx, id));
  const back = d.scope === "institutional" ? { href: "/documentos/normas", label: "Normas e manuais" } : { href: "/documentos", label: "Meus documentos" };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Documentos", href: "/documentos" }, { label: d.title }]} />
      <Link href={back.href} className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> {back.label}
      </Link>
      <div className="mt-2 flex items-start gap-4 lg:mt-6">
        <FileIcon mimeType={d.current?.mimeType ?? "application/pdf"} className="mt-1 h-14 w-11" />
        <div className="min-w-0">
          <DocCategoryBadge name={d.category.name} color={d.category.color} />
          <h1 className="mt-2 text-[1.875rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.25rem]">{d.title}</h1>
          {d.description && <p className="mt-1 text-muted">{d.description}</p>}
        </div>
      </div>

      <Card className="mt-6 p-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
          <div>
            <dt className="text-muted">{d.scope === "institutional" ? "Publicado em" : "Recebido em"}</dt>
            <dd className="font-semibold text-ink">{fmtDate(d.createdAt)}</dd>
          </div>
          {d.referencePeriod && (
            <div>
              <dt className="text-muted">Referência</dt>
              <dd className="font-semibold text-ink">{d.referencePeriod}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Versão</dt>
            <dd className="font-semibold text-ink">
              {d.current?.versionNumber ?? 1} {d.versions.length > 1 && <span className="font-normal text-muted">(de {d.versions.length})</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Arquivo</dt>
            <dd className="font-semibold break-all text-ink">
              {d.current?.fileName} • {d.current ? fmtFileSize(d.current.sizeBytes) : ""}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a href={`/api/v1/documents/${d.id}/file?disposition=inline`} target="_blank" rel="noopener" className={buttonClasses("outline", "md")}>
            <Eye className="size-5" aria-hidden /> Visualizar
          </a>
          <a href={`/api/v1/documents/${d.id}/file?disposition=attachment`} className={buttonClasses("primary", "md")}>
            <Download className="size-5" aria-hidden /> Baixar
          </a>
        </div>
      </Card>

      {d.requiresAck && (
        <div id="ciencia" className="mt-6 scroll-mt-28">
          <AcknowledgeBox endpoint={`/documents/${d.id}/acknowledge`} acknowledgedAt={d.acknowledgedAt?.toISOString() ?? null} subject="documento" />
        </div>
      )}

      <section aria-labelledby="hist" className="mt-8">
        <h2 id="hist" className="text-lg font-bold text-ink">
          Seu histórico com este documento
        </h2>
        {d.history.length === 0 ? (
          <p className="mt-2 text-[0.9375rem] text-muted">Você ainda não abriu nem baixou este documento.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {d.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-4 py-2.5 text-[0.9375rem]">
                <span className="text-ink">{ACTION_LABEL[h.action] ?? h.action}</span>
                <span className="text-muted">{fmtDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
