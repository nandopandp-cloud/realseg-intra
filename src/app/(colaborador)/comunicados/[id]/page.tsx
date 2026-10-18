import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { Breadcrumbs, CategoryLabel } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { toTone } from "@/components/ui/icons";
import { AcknowledgeBox, FavoriteButton, MarkAnnouncementRead } from "@/features/announcements/actions";
import { fmtDateLong, fmtFileSize } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getAnnouncement } from "@/server/services/announcements";
import { z } from "zod";

export const metadata: Metadata = { title: "Comunicado" };

export default async function AnnouncementPage({ params }: PageProps<"/comunicados/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const a = await getAnnouncement(ctx, id).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  return (
    <article className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <MarkAnnouncementRead id={a.id} />
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Comunicados", href: "/comunicados" }, { label: a.title }]} />
      <Link href="/comunicados" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Comunicados
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3 lg:mt-6">
        <CategoryLabel tone={a.isImportant ? "teal" : toTone(a.category.color)}>{a.isImportant ? "Importante" : a.category.name}</CategoryLabel>
        {a.isImportant && <span className="text-sm text-muted">• {a.category.name}</span>}
      </div>
      <h1 className="mt-3 text-[2rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">{a.title}</h1>
      <p className="mt-3 text-[0.9375rem] text-muted">
        Publicado em {a.publishedAt ? fmtDateLong(a.publishedAt) : "—"} por <span className="font-semibold text-ink">{a.authorLabel}</span>
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <FavoriteButton id={a.id} initial={a.isFavorite} />
      </div>

      <p className="mt-8 text-[1.125rem] leading-relaxed text-ink">{a.summary}</p>
      <RichText text={a.body} className="prose-rs mt-5" />

      {a.attachments.length > 0 && (
        <section aria-labelledby="anexos" className="mt-8">
          <h2 id="anexos" className="flex items-center gap-2 text-lg font-bold text-ink">
            <Paperclip className="size-5" aria-hidden /> Anexos
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {a.attachments.map((f) => (
              <li key={f.id}>
                <a href={`/api/v1/announcements/${a.id}/attachments/${f.id}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 py-3 hover:bg-canvas">
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">{f.name}</span>
                    <span className="block text-sm text-muted">{fmtFileSize(f.sizeBytes)}</span>
                  </span>
                  <Download className="size-5 text-muted" aria-hidden />
                  <span className="sr-only">Baixar</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.requiresAck && (
        <div className="mt-8">
          <AcknowledgeBox endpoint={`/announcements/${a.id}/acknowledge`} acknowledgedAt={a.acknowledgedAt?.toISOString() ?? null} subject="comunicado" />
        </div>
      )}
    </article>
  );
}
