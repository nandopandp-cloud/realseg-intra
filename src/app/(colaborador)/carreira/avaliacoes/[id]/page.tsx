import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Badge, Breadcrumbs, Card } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { AcknowledgeBox } from "@/features/announcements/actions";
import { fmtDateLong } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { FEEDBACK_TYPE_LABEL, getMyFeedback } from "@/server/services/feedbacks";

export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackPage({ params }: PageProps<"/carreira/avaliacoes/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const f = await orNotFound(getMyFeedback(ctx, id));
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Minha carreira", href: "/carreira" }, { label: "Avaliações", href: "/carreira/avaliacoes" }, { label: f.title }]} />
      <Link href="/carreira/avaliacoes" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Avaliações
      </Link>
      <div className="mt-2 flex flex-wrap gap-2 lg:mt-6">
        <Badge tone="amber">{FEEDBACK_TYPE_LABEL[f.type]}</Badge>
        {f.cycle && <Badge tone="slate">{f.cycle}</Badge>}
      </div>
      <h1 className="mt-3 text-[2rem] font-bold tracking-tight text-ink">{f.title}</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">
        Registrado por <strong className="text-ink">{f.authorLabel}</strong>
        {f.authorLabel !== f.authorContext ? ` (${f.authorContext})` : ""} em {f.publishedAt ? fmtDateLong(f.publishedAt) : "—"}
      </p>
      <Card className="mt-6 p-5 sm:p-7" as="div">
        <RichText text={f.body} />
      </Card>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted">
        <Lock className="size-4" aria-hidden /> Conteúdo confidencial: visível apenas para você, o autor e o RH autorizado.
      </p>
      <div className="mt-6">
        <AcknowledgeBox endpoint={`/feedbacks/${f.id}/acknowledge`} acknowledgedAt={f.acknowledgedAt ? new Date(f.acknowledgedAt).toISOString() : null} subject="feedback" />
      </div>
    </div>
  );
}
