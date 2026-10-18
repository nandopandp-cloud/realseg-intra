import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Download, ShieldCheck, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { FileIcon } from "@/components/ui/file-icon";
import { IconByKey, TONE, toTone } from "@/components/ui/icons";
import { Breadcrumbs } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { AcknowledgeBox, DownloadAllButton, FavoriteButton, MarkAnnouncementRead, ShareButton } from "@/features/announcements/actions";
import { HighlightIcon } from "@/features/announcements/highlight-icon";
import { cn } from "@/lib/cn";
import { fmtDateLong, fmtFileSize } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getAnnouncementPage } from "@/server/services/announcements";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { z } from "zod";

export const metadata: Metadata = { title: "Comunicado" };

/** "PDF", "PNG"… a partir do tipo real do arquivo. */
const typeLabel = (mime: string) => (mime === "application/pdf" ? "PDF" : (mime.split("/")[1] ?? "arquivo").replace("jpeg", "jpg").toUpperCase());
const fmtTime = (d: Date) => format(new TZDate(d, "America/Sao_Paulo"), "HH:mm");

/** Leitura de comunicado — fiel a referencias/Colado 2026-10-18 às 12.08.10.png (desktop); no celular as colunas empilham. */
export default async function AnnouncementPage({ params }: PageProps<"/comunicados/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const a = await getAnnouncementPage(ctx, id).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const fileUrl = (fileId: string) => `/api/v1/announcements/${a.id}/attachments/${fileId}`;
  const ticketHref = `/solicitacoes/nova${a.supportTicketCategory ? `?categoria=${encodeURIComponent(a.supportTicketCategory)}` : ""}`;

  return (
    <article className="relative">
      <MarkAnnouncementRead id={a.id} />

      {/* Capa: faixa à direita no desktop (atrás do título, com degradê), banner no topo no celular. */}
      {a.coverImage && (
        <div className="pointer-events-none relative h-44 overflow-hidden sm:h-56 lg:absolute lg:top-0 lg:right-0 lg:h-[15.75rem] lg:w-[60%]" aria-hidden>
          <Image src={a.coverImage} alt="" fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-[70%_center]" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent lg:bg-gradient-to-r lg:from-surface lg:via-surface/30" />
        </div>
      )}

      <div className="relative grid grid-cols-1 gap-6 px-4 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23.5rem] lg:gap-6 lg:pt-6 lg:pr-6 lg:pl-14">
        <div className="min-w-0">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Comunicados", href: "/comunicados" }, { label: a.title }]} />
          <Link href="/comunicados" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
            <ArrowLeft className="size-4" aria-hidden /> Comunicados
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-2 lg:mt-4">
            {a.isImportant && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold tracking-wide text-brand-700 uppercase">
                <span className="size-1.5 rounded-full bg-brand-500" aria-hidden /> Importante
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">
              <span className={cn("size-1.5 rounded-full", TONE[toTone(a.category.color)].dot)} aria-hidden /> {a.category.name}
            </span>
          </div>

          <h1 className="mt-3 max-w-[26rem] text-[2.125rem] leading-[1.08] font-bold tracking-[-0.03em] text-ink sm:text-[2.5rem] lg:max-w-[25rem] lg:text-[2.875rem]">{a.title}</h1>
          <p className="mt-2 max-w-[30rem] text-[1.0625rem] leading-snug text-muted lg:text-[1.1875rem]">{a.summary}</p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-950" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element -- símbolo oficial estático */}
                <img src="/logo/symbol-on-dark.svg" alt="" width={26} height={20} />
              </span>
              <p className="text-[0.9375rem] leading-snug text-muted">
                Publicado por <span className="font-semibold text-ink">{a.authorLabel}</span>
                {a.publishedAt && (
                  <span className="block">
                    {fmtDateLong(a.publishedAt)} • {fmtTime(a.publishedAt)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <FavoriteButton id={a.id} initial={a.isFavorite} className="rounded-xl px-5" />
              <ShareButton title={a.title} className="rounded-xl px-5" />
            </div>
          </div>

          {a.effectiveNote && (
            <section aria-labelledby="vigencia" className="mt-8 flex items-center gap-4 rounded-2xl bg-brand-50 p-4 sm:gap-5">
              <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 sm:size-[4.5rem]" aria-hidden>
                <CalendarClock className="size-8" strokeWidth={1.8} />
              </span>
              <div>
                <h2 id="vigencia" className="text-[1.0625rem] font-bold text-ink">
                  Quando começa a valer?
                </h2>
                <p className="mt-1 text-[0.9375rem] leading-snug text-body">{a.effectiveNote}</p>
              </div>
            </section>
          )}

          {a.highlights.length > 0 && (
            <section aria-labelledby="o-que-muda" className="mt-8">
              <h2 id="o-que-muda" className="text-[1.3125rem] font-bold tracking-tight text-ink">
                O que muda
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {a.highlights.map((h, i) => (
                  <li key={h.title} className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
                    <HighlightIcon name={h.icon} index={i} />
                    <h3 className="mt-4 text-[1.0625rem] leading-snug font-bold text-ink">{h.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-snug text-muted">{h.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <RichText text={a.body} className="prose-rs mt-8 [&_h2]:text-[1.3125rem] [&_h2]:tracking-tight [&>h2:first-child]:mt-0 [&>h2+*]:mt-2" />

          {a.requiresAck && (
            <div className="mt-8">
              <AcknowledgeBox endpoint={`/announcements/${a.id}/acknowledge`} acknowledgedAt={a.acknowledgedAt?.toISOString() ?? null} subject="comunicado" />
            </div>
          )}

          <section aria-labelledby="duvidas" className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-canvas p-4 sm:flex-row sm:items-center sm:gap-5">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600" aria-hidden>
              <ShieldCheck className="size-7" strokeWidth={1.8} />
            </span>
            <div className="flex-1">
              <h2 id="duvidas" className="font-bold text-ink">
                Dúvidas?
              </h2>
              <p className="mt-0.5 text-sm leading-snug text-muted">
                Em caso de dúvidas, entre em contato com a sua liderança ou abra uma solicitação para a equipe de {a.authorLabel}.
              </p>
            </div>
            <ButtonLink href={ticketHref} className="rounded-xl px-5" iconRight={<ArrowRight className="size-4" aria-hidden />}>
              Abrir solicitação
            </ButtonLink>
          </section>
        </div>

        <aside className="flex flex-col gap-4 pb-4 lg:pt-[14.5rem]" aria-label="Informações do comunicado">
          {a.attachments.length > 0 && (
            <section aria-labelledby="anexos" className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <h2 id="anexos" className="text-[1.0625rem] font-bold text-ink">
                  Arquivos e anexos ({a.attachments.length})
                </h2>
                {a.attachments.length > 1 && <DownloadAllButton urls={a.attachments.map((f) => fileUrl(f.id))} />}
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {a.attachments.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 shadow-[var(--shadow-card)]">
                    <FileIcon mimeType={f.mimeType} className="h-10 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{f.name.replace(/\.[a-z0-9]+$/i, "")}</span>
                      <span className="block text-xs text-muted">
                        {typeLabel(f.mimeType)} • {fmtFileSize(f.sizeBytes)}
                      </span>
                    </span>
                    <a href={fileUrl(f.id)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-canvas" aria-label={`Baixar ${f.name}`}>
                      <Download className="size-5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="publico" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-blue-50 p-5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600" aria-hidden>
              <UsersRound className="size-6" strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="publico" className="font-bold text-ink">
                Público-alvo
              </h2>
              <p className="text-sm text-muted">{a.audience.join(", ")}</p>
            </div>
          </section>

          {a.tags.length > 0 && (
            <section aria-labelledby="tags" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <h2 id="tags" className="text-[1.0625rem] font-bold text-ink">
                Tags
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {a.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/comunicados?tag=${encodeURIComponent(t)}`} className="inline-flex min-h-9 items-center rounded-full bg-brand-50 px-4 text-sm text-brand-700 hover:bg-brand-100">
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {a.related.length > 0 && (
            <section aria-labelledby="relacionados" className="px-1 pt-2">
              <div className="flex items-center justify-between">
                <h2 id="relacionados" className="text-[1.0625rem] font-bold text-ink">
                  Relacionados
                </h2>
                <Link href="/comunicados" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                  Ver todos <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <ul className="mt-1 flex flex-col gap-3">
                {a.related.map((r) => {
                  const tone = TONE[toTone(r.category.color)];
                  return (
                    <li key={r.id}>
                      <Link href={`/comunicados/${r.id}`} className="group flex items-center gap-4 rounded-xl">
                        <span className={cn("relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg", tone.tile, tone.icon)} aria-hidden>
                          {r.coverImage ? <Image src={r.coverImage} alt="" fill sizes="96px" className="object-cover" /> : <IconByKey name={r.category.icon} className="size-7" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm leading-snug font-semibold text-ink group-hover:underline">{r.title}</span>
                          {r.publishedAt && <span className="mt-1 block text-xs text-muted">{fmtDateLong(r.publishedAt)}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
