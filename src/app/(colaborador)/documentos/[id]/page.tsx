import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, CircleCheck, Download, Eye, History, LifeBuoy, ShieldCheck } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { docIconVariant, FileIcon } from "@/components/ui/file-icon";
import { Breadcrumbs, Card } from "@/components/ui/primitives";
import { AcknowledgeBox } from "@/features/announcements/actions";
import { DocCategoryBadge } from "@/features/documents/category-badge";
import { fmtDate, fmtDateTime, fmtFileSize } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { getDocument, listMyDocuments, listPolicies } from "@/server/services/documents";

export const metadata: Metadata = { title: "Documento" };

const ACTION_LABEL: Record<string, string> = { "document.downloaded": "Você baixou", "document.viewed": "Você visualizou", "document.acknowledged": "Você confirmou ciência" };
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-09" → "Setembro de 2026"; outros formatos ficam como estão. */
function fmtPeriod(p: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  if (!m) return p;
  const name = MONTHS[Number(m[2]) - 1];
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${m[1]}` : p;
}

const formatLabel = (mime: string) => (mime === "application/pdf" ? "PDF" : (mime.split("/")[1] ?? "arquivo").replace("jpeg", "jpg").toUpperCase());

export default async function DocumentPage({ params }: PageProps<"/documentos/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const d = await orNotFound(getDocument(ctx, id));
  const institutional = d.scope === "institutional";
  const back = institutional ? { href: "/documentos/normas", label: "Normas e manuais" } : { href: "/documentos", label: "Meus documentos" };

  // Outros documentos da mesma categoria (pessoais) ou demais normas (institucionais).
  const related = institutional
    ? (await listPolicies(ctx)).filter((p) => p.id !== d.id).slice(0, 4).map((p) => ({ id: p.id, title: p.title, sub: p.description ?? "", mime: "application/pdf", variant: "manual" as const }))
    : (await listMyDocuments(ctx, { category: d.category.slug, pageSize: 5 })).items
        .filter((x) => x.id !== d.id)
        .slice(0, 4)
        .map((x) => ({ id: x.id, title: x.title, sub: `Recebido em ${fmtDate(x.createdAt)}`, mime: x.file.mimeType, variant: docIconVariant(x.category.slug) }));

  const mime = d.current?.mimeType ?? "application/pdf";
  const facts: Array<[string, string]> = [
    [institutional ? "Publicado em" : "Recebido em", fmtDate(d.createdAt)],
    ...(d.referencePeriod ? [["Referência", fmtPeriod(d.referencePeriod)] as [string, string]] : []),
    ...(institutional && d.effectiveFrom ? [["Vigente desde", fmtDate(d.effectiveFrom)] as [string, string]] : []),
    ["Categoria", d.category.name],
    ["Formato", d.current ? `${formatLabel(mime)} • ${fmtFileSize(d.current.sizeBytes)}` : formatLabel(mime)],
    ["Versão", `${d.current?.versionNumber ?? 1}${d.versions.length > 1 ? ` (de ${d.versions.length})` : ""}`],
  ];

  return (
    <div className="px-4 pt-6 pb-4 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Documentos", href: "/documentos" }, ...(institutional ? [{ label: "Normas e manuais", href: "/documentos/normas" }] : []), { label: d.title }]} />
      <Link href={back.href} className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> {back.label}
      </Link>

      <div className="mt-2 grid grid-cols-1 gap-6 lg:mt-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <FileIcon mimeType={mime} variant={institutional ? "manual" : docIconVariant(d.category.slug)} className="mt-1 h-14 w-11" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DocCategoryBadge name={d.category.name} color={d.category.color} />
                {d.category.sensitive && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                    <ShieldCheck className="size-3.5 text-brand-600" aria-hidden /> Documento pessoal e confidencial
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-[1.875rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.25rem]">{d.title}</h1>
              {d.description && <p className="mt-1 text-[1.0625rem] text-muted">{d.description}</p>}
            </div>
          </div>

          <Card className="mt-6 p-5 sm:p-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[0.9375rem] sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold break-words text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row">
              <a href={`/api/v1/documents/${d.id}/file?disposition=attachment`} className={buttonClasses("primary", "md")}>
                <Download className="size-5" aria-hidden /> Baixar documento
              </a>
              <a href={`/api/v1/documents/${d.id}/file?disposition=inline`} target="_blank" rel="noopener" className={buttonClasses("outline", "md")}>
                <Eye className="size-5" aria-hidden /> Visualizar em nova aba
              </a>
            </div>
            <p className="mt-3 text-sm text-muted">{d.current?.fileName}</p>
          </Card>

          {d.requiresAck && (
            <div id="ciencia" className="mt-6 scroll-mt-28">
              <AcknowledgeBox endpoint={`/documents/${d.id}/acknowledge`} acknowledgedAt={d.acknowledgedAt?.toISOString() ?? null} subject="documento" />
            </div>
          )}

          {d.versions.length > 1 && (
            <section aria-labelledby="versoes" className="mt-8">
              <h2 id="versoes" className="text-lg font-bold text-ink">
                Versões
              </h2>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
                {d.versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[0.9375rem]">
                    <span className="font-semibold text-ink">
                      Versão {v.versionNumber}
                      {v.id === d.current?.id && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">atual</span>}
                    </span>
                    <span className="text-muted">
                      {fmtDate(v.createdAt)}
                      {v.changeNote ? ` — ${v.changeNote}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="hist" className="mt-8">
            <h2 id="hist" className="flex items-center gap-2 text-lg font-bold text-ink">
              <History className="size-5 text-brand-600" aria-hidden /> Seu histórico com este documento
            </h2>
            {d.history.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-muted">Você ainda não abriu nem baixou este documento.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {d.history.map((h, i) => (
                  <li key={i} className="flex justify-between gap-4 py-2.5 text-[0.9375rem]">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <CircleCheck className="size-4 text-brand-600" aria-hidden /> {ACTION_LABEL[h.action] ?? h.action}
                    </span>
                    <span className="text-muted">{fmtDateTime(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Mais sobre este documento">
          {related.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-ink">{institutional ? "Outras normas" : `Outros: ${d.category.name}`}</h2>
                <Link href={institutional ? "/documentos/normas" : `/documentos?categoria=${encodeURIComponent(d.category.slug)}&todos=1`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                  Ver todos <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <ul className="mt-1 divide-y divide-line">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/documentos/${r.id}`} className="flex min-h-14 items-center gap-3 py-3 hover:bg-canvas">
                      <FileIcon mimeType={r.mime} variant={r.variant} className="h-9 w-7" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{r.title}</span>
                        <span className="block truncate text-sm text-muted">{r.sub}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="border-brand-100 bg-brand-50 p-5">
            <div className="flex gap-3">
              <LifeBuoy className="size-6 shrink-0 text-brand-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Dúvidas sobre este documento?</h2>
                <p className="mt-1 text-[0.9375rem] text-muted">Abra uma solicitação para o RH. O documento já vai identificado no pedido.</p>
              </div>
            </div>
            <ButtonLink
              href={`/solicitacoes/nova?categoria=rh&assunto=${encodeURIComponent(`Dúvida sobre: ${d.title}`)}`}
              variant="outline"
              className="mt-4 w-full border-brand-200 bg-surface text-brand-700"
              iconRight={<ArrowRight className="size-4" aria-hidden />}
            >
              Abrir solicitação
            </ButtonLink>
          </Card>
        </aside>
      </div>
    </div>
  );
}
