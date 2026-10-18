import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Paperclip } from "lucide-react";
import { IconByKey, toTone, TONE } from "@/components/ui/icons";
import { Alert, Badge, Breadcrumbs, Card } from "@/components/ui/primitives";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { ReplyForm, TicketActions } from "@/features/tickets/ticket-actions";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtFileSize, fmtTicketNumber } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { orNotFound } from "@/server/http/page";
import { getMyTicket, STATUS_LABEL } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Solicitação" };

const EVENT_LABEL: Record<string, (e: { fromValue: string | null; toValue: string | null }) => string> = {
  created: () => "Solicitação aberta",
  status_changed: (e) => `Situação alterada para "${STATUS_LABEL[e.toValue as keyof typeof STATUS_LABEL] ?? e.toValue}"`,
  assigned: () => "Atendente designado",
  priority_changed: () => "Prioridade ajustada",
  sla_paused: () => "Prazo pausado (aguardando sua resposta)",
  sla_resumed: () => "Prazo retomado",
};

export default async function TicketPage({ params, searchParams }: PageProps<"/solicitacoes/[numero]">) {
  const ctx = await requireCtx();
  const { numero } = await params;
  if (!/^\d{1,9}$/.test(numero)) notFound();
  const t = await orNotFound(getMyTicket(ctx, Number(numero)));
  const created = (await searchParams).criada === "1";
  const tone = toTone(t.category.color);
  const filesFor = (messageId: string | null) => t.attachments.filter((a) => a.messageId === messageId);
  const attachmentList = (messageId: string | null) =>
    filesFor(messageId).length ? (
      <ul className="mt-2 flex flex-wrap gap-2">
        {filesFor(messageId).map((a) => (
          <li key={a.id}>
            <a href={`/api/v1/tickets/${t.number}/attachments/${a.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-canvas">
              <Paperclip className="size-4" aria-hidden /> {a.name} <span className="text-muted">({fmtFileSize(a.sizeBytes)})</span>
            </a>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Minhas solicitações", href: "/solicitacoes" }, { label: fmtTicketNumber(t.number) }]} />
      <Link href="/solicitacoes" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Solicitações
      </Link>
      {created && (
        <Alert kind="success" title="Solicitação enviada!" className="mt-3">
          Seu protocolo é <strong>{fmtTicketNumber(t.number)}</strong>. Avisaremos por notificação a cada atualização.
        </Alert>
      )}
      <div className="mt-3 flex items-start gap-4 lg:mt-5">
        <span className={cn("hidden size-14 shrink-0 items-center justify-center rounded-full sm:inline-flex", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
          <IconByKey name={t.category.icon} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            Protocolo {fmtTicketNumber(t.number)} <Badge tone={tone}>{t.category.name}</Badge>
          </p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.25rem]">{t.subject}</h1>
          <div className="mt-2">
            <TicketStatusBadge status={t.status} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="conversa">
            <h2 id="conversa" className="sr-only">
              Conversa
            </h2>
            <ol className="flex flex-col gap-3">
              <li className="rounded-[var(--radius-card)] border border-line bg-canvas p-4">
                <p className="text-sm text-muted">
                  <strong className="text-ink">Você</strong> • {fmtDateTime(t.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-ink">{t.description}</p>
                {attachmentList(null)}
              </li>
              {t.messages.map((m) => (
                <li key={m.id} className={cn("rounded-[var(--radius-card)] border p-4", m.mine ? "border-line bg-canvas" : "border-brand-100 bg-brand-50")}>
                  <p className="text-sm text-muted">
                    <strong className="text-ink">{m.mine ? "Você" : m.authorName}</strong> {!m.mine && <span>(atendimento)</span>} • {fmtDateTime(m.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-ink">{m.body}</p>
                  {attachmentList(m.id)}
                </li>
              ))}
            </ol>
          </section>

          {t.actions.canReply ? (
            <Card className="p-4 sm:p-5">
              <ReplyForm number={t.number} waiting={t.status === "aguardando_colaborador"} />
            </Card>
          ) : (
            (t.status === "fechado" || t.status === "cancelado") && (
              <Alert kind="info" title={t.status === "fechado" ? "Solicitação concluída" : "Solicitação cancelada"}>
                Precisa de algo mais?{" "}
                <Link href="/solicitacoes/nova" className="font-semibold text-brand-700 underline">
                  Abra uma nova solicitação
                </Link>
                .
              </Alert>
            )
          )}
          <TicketActions number={t.number} status={t.status} canCancel={t.actions.canCancel} canConfirm={t.actions.canConfirm} canReopen={t.actions.canReopen} />
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5" aria-labelledby="prazo">
            <h2 id="prazo" className="flex items-center gap-2 font-bold text-ink">
              <Clock className="size-5 text-brand-600" aria-hidden /> Prazo
            </h2>
            <div className="mt-3">
              <SlaMeter sla={t.sla} />
            </div>
            {t.sla.kind !== "none" && (
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-muted">Resolução prevista até</dt>
                  <dd className="font-semibold text-ink">{fmtDateTime(t.sla.dueAt)}</dd>
                </div>
                {t.sla.firstResponse && (
                  <div>
                    <dt className="text-muted">Primeira resposta</dt>
                    <dd className="font-semibold text-ink">
                      {t.sla.firstResponse.respondedAt ? `Respondida em ${fmtDateTime(t.sla.firstResponse.respondedAt)}` : `Prevista até ${fmtDateTime(t.sla.firstResponse.dueAt!)}`}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <p className="mt-3 text-xs text-muted">Prazos contam apenas horário de atendimento (dias úteis), conforme a política da área.</p>
          </Card>
          <Card className="p-5" aria-labelledby="historico">
            <h2 id="historico" className="font-bold text-ink">
              Histórico
            </h2>
            <ol className="mt-3 flex flex-col gap-3">
              {t.events.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <span>
                    <span className="block text-ink">{EVENT_LABEL[e.type]?.(e) ?? e.type}</span>
                    <span className="block text-muted">{fmtDateTime(e.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
