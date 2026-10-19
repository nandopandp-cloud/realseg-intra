import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowLeft, Clock, Lightbulb, ListChecks } from "lucide-react";
import { z } from "zod";
import { Breadcrumbs, Card } from "@/components/ui/primitives";
import { TicketForm } from "@/features/tickets/ticket-form";
import { requireCtx } from "@/server/auth/current";
import { categorySlaSummary, getDraft, listTicketCategories, supportHours } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Nova solicitação" };

const STEPS = [
  { title: "Escolha a área", text: "RH, TI, Serviços ou Facilities." },
  { title: "Descreva o pedido", text: "Assunto curto e detalhes. Anexe fotos ou documentos, se ajudar." },
  { title: "Acompanhe", text: "Você recebe um protocolo, vê o prazo e é avisado a cada resposta." },
];

export default async function NewTicketPage({ searchParams }: PageProps<"/solicitacoes/nova">) {
  const ctx = await requireCtx();
  const sp = z
    .object({ categoria: z.string().max(50).optional().catch(undefined), assunto: z.string().max(200).optional().catch(undefined), rascunho: z.uuid().optional().catch(undefined) })
    .parse(await searchParams);
  const [categories, draft, slas, hours] = await Promise.all([listTicketCategories(), sp.rascunho ? getDraft(ctx, sp.rascunho).catch(() => null) : null, categorySlaSummary(), supportHours()]);
  const initial = draft
    ? { draftId: draft.id, categorySlug: draft.category?.slug ?? undefined, subject: draft.subject, description: draft.description }
    : { categorySlug: categories.some((c) => c.slug === sp.categoria) ? sp.categoria : undefined, subject: sp.assunto?.slice(0, 120) };

  return (
    <div className="px-4 pt-5 pb-2 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Minhas solicitações", href: "/solicitacoes" }, { label: "Nova solicitação" }]} />
      <Link href="/solicitacoes" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Solicitações
      </Link>
      <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-ink sm:text-[2.5rem] lg:mt-4">{draft ? "Continuar rascunho" : "Nova solicitação"}</h1>
      <p className="mt-1 text-[1.0625rem] text-muted">Leva menos de 2 minutos. Você recebe um protocolo e acompanha o prazo.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="p-4 sm:p-6">
          <TicketForm categories={categories} initial={initial} />
        </Card>

        <aside className="flex flex-col gap-4" aria-label="Como funciona o atendimento">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <ListChecks className="size-5 text-brand-600" aria-hidden /> Como funciona
            </h2>
            <ol className="mt-3 flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700" aria-hidden>
                    {i + 1}
                  </span>
                  <p className="text-[0.9375rem] leading-snug text-muted">
                    <span className="block font-semibold text-ink">{s.title}</span>
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </Card>

          {slas.length > 0 && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-bold text-ink">
                <Clock className="size-5 text-brand-600" aria-hidden /> Prazos de atendimento
              </h2>
              <table className="mt-3 w-full text-left text-sm">
                <caption className="sr-only">Prazos padrão por área</caption>
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="pb-1.5 font-medium">Área</th>
                    <th scope="col" className="pb-1.5 font-medium">1ª resposta</th>
                    <th scope="col" className="pb-1.5 font-medium">Solução</th>
                  </tr>
                </thead>
                <tbody>
                  {slas.map((s) => (
                    <tr key={s.slug} className="border-t border-line">
                      <th scope="row" className="py-2 font-semibold text-ink">
                        {s.name}
                      </th>
                      <td className="py-2 text-muted">até {s.firstResponse}</td>
                      <td className="py-2 text-muted">até {s.resolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hours && <p className="mt-3 text-sm text-muted">Atendimento: {hours.label}, {hours.hours}. O prazo só conta em horário de atendimento.</p>}
            </Card>
          )}

          <div className="flex gap-3 rounded-[var(--radius-card)] border border-amber-100 bg-amber-50 p-4">
            <Lightbulb className="size-5 shrink-0 text-amber-600" aria-hidden />
            <p className="text-[0.9375rem] text-muted">
              Dúvida simples? Talvez a resposta já esteja na{" "}
              <Link href="/ajuda" className="font-semibold text-brand-600 underline">
                central de ajuda
              </Link>
              . Ao digitar o assunto, sugerimos artigos relacionados.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
