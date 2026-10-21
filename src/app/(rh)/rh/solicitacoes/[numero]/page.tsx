import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Lock, MessageCircle, Paperclip } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { iconFor, toTone } from "@/components/ui/icons";
import { Avatar, Badge, Card, IconTile } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { AgentReplyForm, TicketControls } from "@/features/rh/tickets/agent-actions";
import { AgentStatusBadge, PriorityBadge } from "@/features/rh/tickets/badges";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtFileSize, fmtTicketNumber } from "@/lib/format";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseTicketNumber } from "@/server/http/params";
import { AGENT_STATUS_LABEL, getTicketForAgent, PRIORITY_LABEL } from "@/server/services/rh/tickets";
import type { TicketPriority, TicketStatus } from "@/server/db/schema";

export async function generateMetadata({ params }: PageProps<"/rh/solicitacoes/[numero]">): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Solicitação #${numero} · Gestão` };
}

function eventText(e: { type: string; fromLabel: string | null; toLabel: string | null; note: string | null }) {
  switch (e.type) {
    case "created":
      return "Solicitação aberta";
    case "status_changed":
      return `Situação: ${AGENT_STATUS_LABEL[e.fromLabel as TicketStatus] ?? e.fromLabel} → ${AGENT_STATUS_LABEL[e.toLabel as TicketStatus] ?? e.toLabel}`;
    case "assigned":
      return e.toLabel ? `Responsável: ${e.toLabel}` : "Responsável removido";
    case "priority_changed":
      return `Prioridade: ${PRIORITY_LABEL[e.fromLabel as TicketPriority] ?? e.fromLabel} → ${PRIORITY_LABEL[e.toLabel as TicketPriority] ?? e.toLabel}`;
    case "sla_paused":
      return "Prazo pausado (aguardando colaborador)";
    case "sla_resumed":
      return "Prazo retomado";
    case "sla_warning":
      return "Alerta: prazo próximo do vencimento";
    case "sla_breached":
      return e.note ?? "Prazo excedido";
    default:
      return e.type;
  }
}

/** Atendimento de uma solicitação: conversa completa (inclusive notas internas), resposta e controles. */
export default async function AgentTicketPage({ params }: PageProps<"/rh/solicitacoes/[numero]">) {
  const ctx = await requireRhCtx("ticket:read:any");
  const { numero } = await params;
  const t = await orNotFound(Promise.resolve().then(() => getTicketForAgent(ctx, parseTicketNumber(numero))));
  const canManageTicket = can(ctx.actor, "ticket:manage");
  const Icon = iconFor(t.category.icon);
  const attachmentsOf = (messageId: string | null) => t.attachments.filter((a) => a.messageId === messageId);
  const attHref = (id: string) => `/api/v1/rh/tickets/${t.number}/attachments/${id}`;
  const slaForAgent = t.sla.kind === "paused" ? { ...t.sla, statusLabel: "Prazo pausado: aguardando o colaborador" } : t.sla;

  return (
    <AdminPage>
      <AdminPageHeader
        title={t.subject}
        crumbs={[{ label: "Solicitações", href: "/rh/solicitacoes" }]}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-muted">{fmtTicketNumber(t.number)}</span>
            <AgentStatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            {t.channel === "chat" && <Badge tone="indigo">Chat</Badge>}
          </div>
        }
        description={`Aberta em ${fmtDateTime(t.createdAt)} · ${t.category.name}`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={Icon} tone={toTone(t.category.color)} size="sm" />
              <h2 className="text-lg font-bold text-ink">Pedido do colaborador</h2>
            </div>
            <RichText text={t.description} className="mt-3" />
            {attachmentsOf(null).length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Anexos do pedido">
                {attachmentsOf(null).map((a) => (
                  <li key={a.id}>
                    <a href={attHref(a.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink hover:bg-canvas">
                      <Paperclip className="size-4" aria-hidden /> {a.name} <span className="text-muted">({fmtFileSize(a.sizeBytes)})</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5" aria-labelledby="conversa">
            <h2 id="conversa" className="flex items-center gap-2 text-lg font-bold text-ink">
              <MessageCircle className="size-5 text-brand-600" aria-hidden /> Conversa
            </h2>
            {t.messages.length === 0 ? (
              <p className="mt-3 text-[0.9375rem] text-muted">Ainda não há mensagens. A primeira resposta registra o atendimento inicial do prazo.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-4" aria-label="Mensagens da solicitação">
                {t.messages.map((m) => (
                  <li key={m.id} className={cn("flex items-end gap-2.5", m.fromRequester ? "flex-row" : "flex-row-reverse")}>
                    <Avatar name={m.authorName} size="sm" className="shrink-0" />
                    <div className={cn("flex max-w-[min(38rem,88%)] flex-col", m.fromRequester ? "items-start" : "items-end")}>
                      <p className="mb-1 px-1 text-xs text-muted">
                        <strong className="font-semibold text-ink">{m.authorName}</strong>
                        {m.fromRequester ? " · colaborador" : m.isInternal ? " · nota interna" : " · atendimento"} · {fmtDateTime(m.createdAt)}
                      </p>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink",
                          m.isInternal
                            ? "rounded-br-md border border-dashed border-amber-300 bg-amber-50"
                            : m.fromRequester
                              ? "rounded-bl-md border border-line bg-surface shadow-[var(--shadow-card)]"
                              : "rounded-br-md bg-brand-50 ring-1 ring-brand-100",
                        )}
                      >
                        {m.isInternal && (
                          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                            <Lock className="size-3.5" aria-hidden /> Visível só para a equipe
                          </span>
                        )}
                        {m.body}
                        {attachmentsOf(m.id).length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {attachmentsOf(m.id).map((a) => (
                              <li key={a.id}>
                                <a href={attHref(a.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-canvas">
                                  <Paperclip className="size-4" aria-hidden /> {a.name} <span className="text-muted">({fmtFileSize(a.sizeBytes)})</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {canManageTicket && !t.closed && (
            <Card className="p-5">
              <AgentReplyForm number={t.number} transitions={t.transitions} />
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-6" aria-label="Detalhes da solicitação">
          <Card className="p-5" aria-labelledby="solicitante">
            <h2 id="solicitante" className="text-sm font-semibold tracking-wide text-muted uppercase">
              Colaborador
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={t.requester.name} />
              <div className="min-w-0">
                <p className="font-semibold text-ink">{t.requester.name}</p>
                <p className="font-mono text-xs text-muted">Matrícula {t.requester.registration}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Cargo</dt>
              <dd className="text-ink">{t.requester.position}</dd>
              <dt className="text-muted">Área</dt>
              <dd className="text-ink">{t.requester.department}</dd>
              <dt className="text-muted">Unidade</dt>
              <dd className="text-ink">{t.requester.unit}</dd>
            </dl>
            {t.history.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-ink">Outras solicitações</h3>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {t.history.map((h) => (
                    <li key={h.number}>
                      <Link href={`/rh/solicitacoes/${h.number}`} className="flex items-center justify-between gap-2 rounded-lg py-1 text-sm hover:underline">
                        <span className="truncate">
                          <span className="font-mono text-muted">{fmtTicketNumber(h.number)}</span> {h.subject}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{AGENT_STATUS_LABEL[h.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card className="p-5" aria-labelledby="prazo">
            <h2 id="prazo" className="text-sm font-semibold tracking-wide text-muted uppercase">
              Prazo de atendimento
            </h2>
            <div className="mt-3">
              <SlaMeter sla={slaForAgent} />
            </div>
            {t.sla.kind !== "none" && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">Vence em</dt>
                <dd className="text-ink">{fmtDateTime(t.sla.dueAt)}</dd>
                {t.sla.firstResponse && (
                  <>
                    <dt className="text-muted">1ª resposta</dt>
                    <dd className={cn(t.sla.firstResponse.breached ? "font-semibold text-red-700" : "text-ink")}>
                      {t.sla.firstResponse.respondedAt ? `Respondida em ${fmtDateTime(t.sla.firstResponse.respondedAt)}` : `Até ${fmtDateTime(t.sla.firstResponse.dueAt!)}`}
                      {t.sla.firstResponse.breached && " (fora do prazo)"}
                    </dd>
                  </>
                )}
              </dl>
            )}
          </Card>

          {canManageTicket && (
            <Card className="p-5" aria-labelledby="gestao">
              <h2 id="gestao" className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
                Gestão da solicitação
              </h2>
              <TicketControls number={t.number} status={t.status} transitions={t.transitions} assigneeUserId={t.assigneeUserId} agents={t.agents} priority={t.priority} me={ctx.actor.userId} closed={t.closed} />
            </Card>
          )}

          <Card className="p-5" aria-labelledby="historico">
            <h2 id="historico" className="text-sm font-semibold tracking-wide text-muted uppercase">
              Histórico
            </h2>
            <ol className="mt-3 flex flex-col gap-3 border-l border-line pl-4">
              {t.events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-brand-500" aria-hidden />
                  <p className="text-ink">{eventText(e)}</p>
                  <p className="text-xs text-muted">
                    {fmtDateTime(e.createdAt)}
                    {e.actorName ? ` · ${e.actorName}` : e.type.startsWith("sla_") ? " · sistema" : ""}
                    {e.note && e.type === "status_changed" ? ` · “${e.note}”` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </AdminPage>
  );
}
