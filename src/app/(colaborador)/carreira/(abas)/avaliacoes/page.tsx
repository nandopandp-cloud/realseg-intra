import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageSquareText, Star } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { fmtDateLong } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { FEEDBACK_TYPE_LABEL, listMyFeedbacks } from "@/server/services/feedbacks";

export const metadata: Metadata = { title: "Avaliações e feedbacks" };

export default async function FeedbacksPage() {
  const ctx = await requireCtx();
  const items = await listMyFeedbacks(ctx);
  return (
    <section aria-labelledby="fbs">
      <h2 id="fbs" className="text-xl font-bold text-ink">
        Avaliações e feedbacks
      </h2>
      <p className="text-[0.9375rem] text-muted">Somente você, quem registrou e o RH autorizado têm acesso a estes registros.</p>
      {items.length === 0 ? (
        <EmptyState className="mt-5" icon={MessageSquareText} title="Nenhum feedback publicado ainda" description="Quando sua liderança ou o RH publicar um feedback, ele aparecerá aqui." />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((f) => (
            <li key={f.id}>
              <Link href={`/carreira/avaliacoes/${f.id}`} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line p-4 hover:bg-canvas">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600" aria-hidden>
                  {f.type === "reconhecimento" ? <Star className="size-6" /> : <MessageSquareText className="size-6" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{f.title}</span>
                    <Badge tone="slate">{FEEDBACK_TYPE_LABEL[f.type]}</Badge>
                    {!f.acknowledgedAt && <Badge tone="blue">Novo</Badge>}
                  </span>
                  <span className="block text-sm text-muted">
                    {f.cycle ? `${f.cycle} • ` : ""}
                    {f.authorLabel} • {f.publishedAt ? fmtDateLong(f.publishedAt) : ""}
                  </span>
                </span>
                <ChevronRight className="size-5 text-ink/70" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
