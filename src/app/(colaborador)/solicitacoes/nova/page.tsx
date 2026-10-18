import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { z } from "zod";
import { Breadcrumbs, Card } from "@/components/ui/primitives";
import { TicketForm } from "@/features/tickets/ticket-form";
import { requireCtx } from "@/server/auth/current";
import { getDraft, listTicketCategories } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Nova solicitação" };

export default async function NewTicketPage({ searchParams }: PageProps<"/solicitacoes/nova">) {
  const ctx = await requireCtx();
  const sp = z.object({ categoria: z.string().max(50).optional().catch(undefined), rascunho: z.uuid().optional().catch(undefined) }).parse(await searchParams);
  const [categories, draft] = await Promise.all([listTicketCategories(), sp.rascunho ? getDraft(ctx, sp.rascunho).catch(() => null) : null]);
  const initial = draft
    ? { draftId: draft.id, categorySlug: draft.category?.slug ?? undefined, subject: draft.subject, description: draft.description }
    : { categorySlug: categories.some((c) => c.slug === sp.categoria) ? sp.categoria : undefined };
  return (
    <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Minhas solicitações", href: "/solicitacoes" }, { label: "Nova solicitação" }]} />
      <Link href="/solicitacoes" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Solicitações
      </Link>
      <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-ink sm:text-[2.5rem] lg:mt-4">{draft ? "Continuar rascunho" : "Nova solicitação"}</h1>
      <p className="mt-1 text-[1.0625rem] text-muted">Leva menos de 2 minutos. Você recebe um protocolo e acompanha o prazo.</p>
      <Card className="mt-6 p-4 sm:p-6">
        <TicketForm categories={categories} initial={initial} />
      </Card>
      <div className="mt-5 flex gap-3 rounded-[var(--radius-card)] border border-amber-100 bg-amber-50 p-4">
        <Lightbulb className="size-5 shrink-0 text-amber-600" aria-hidden />
        <p className="text-[0.9375rem] text-muted">
          Dúvida simples? Talvez a resposta já esteja na{" "}
          <Link href="/ajuda" className="font-semibold text-brand-600 underline">
            central de ajuda
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
