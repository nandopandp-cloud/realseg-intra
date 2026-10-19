import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowLeft, ArrowRight, ChevronRight, Clock, FileText, History, Info, ShieldCheck } from "lucide-react";
import { Badge, Breadcrumbs, Card } from "@/components/ui/primitives";
import { ChatComposer, ChatLive, ChatStart, EndChatButton } from "@/features/help/support-chat";
import { Conversation, type ConversationMessage } from "@/features/tickets/conversation";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { cn } from "@/lib/cn";
import { fmtDateLong, fmtTicketNumber } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { getProfile } from "@/server/services/profile";
import { activeChatNumber, getMyTicket, listTicketCategories, pastChats, supportHours } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Chat com o suporte" };

/**
 * Chat com o suporte: cada conversa é uma solicitação com canal "chat" (protocolo, prazo e histórico),
 * atendida pela mesma fila. A tela se atualiza sozinha enquanto está aberta.
 */
export default async function SupportChatPage() {
  const ctx = await requireCtx();
  const [open, hours, categories, past, profile] = await Promise.all([activeChatNumber(ctx), supportHours(), listTicketCategories(), pastChats(ctx), getProfile(ctx)]);
  const t = open ? await getMyTicket(ctx, open) : null;
  const firstName = (profile.preferredName ?? profile.fullName ?? "").split(" ")[0] || "colaborador";

  const messages: ConversationMessage[] = t
    ? [
        { id: "abertura", mine: true, authorName: null, body: t.description, createdAt: t.createdAt, attachments: fileList(t, null) },
        ...t.messages.map((m) => ({ id: m.id, mine: m.mine, authorName: m.authorName, body: m.body, createdAt: m.createdAt, attachments: fileList(t, m.id) })),
      ]
    : [];

  return (
    <div className="px-4 pt-5 pb-2 sm:px-6 lg:px-10 lg:pt-8">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte", href: "/ajuda" }, { label: "Chat com o suporte" }]} />
      <Link href="/ajuda" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 lg:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Ajuda e suporte
      </Link>
      <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-ink sm:text-[2.5rem] lg:mt-4">Chat com o suporte</h1>
      <p className="mt-1 text-[1.0625rem] text-muted">Converse com o nosso time. As respostas aparecem aqui automaticamente.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="flex min-h-[32rem] flex-col overflow-hidden p-0" aria-label="Conversa com o suporte">
          {/* Cabeçalho da conversa */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-950" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element -- símbolo oficial estático */}
              <img src="/logo/symbol-on-dark.svg" alt="" width={24} height={19} />
              <span className={cn("absolute right-0 bottom-0 size-3 rounded-full ring-2 ring-surface", hours?.online ? "bg-green-500" : "bg-slate-400")} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">Suporte REALSEG</p>
              <p className="text-sm text-muted">
                <span className="sm:hidden">{hours?.online ? "Online agora" : "Fora do horário"}</span>
                <span className="hidden sm:inline">{hours?.online ? "Online agora — respondemos em horário de atendimento" : "Fora do horário — sua mensagem fica registrada"}</span>
              </p>
            </div>
            {t && (
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                <TicketStatusBadge status={t.status} />
                <EndChatButton number={t.number} canConfirm={t.actions.canConfirm} canCancel={t.actions.canCancel} />
              </div>
            )}
          </div>

          {/* Mensagens */}
          <div id="chat-scroll" className="flex-1 overflow-y-auto bg-canvas/50 px-4 py-5 sm:px-5 lg:max-h-[min(60vh,40rem)]" aria-live="polite">
            {t ? (
              <>
                <p className="mb-4 text-center text-xs text-muted">
                  Conversa iniciada em {fmtDateLong(t.createdAt)} · protocolo{" "}
                  <Link href={`/solicitacoes/${t.number}`} className="font-semibold text-brand-700 underline">
                    {fmtTicketNumber(t.number)}
                  </Link>
                </p>
                <Conversation messages={messages} />
                {t.messages.every((m) => m.mine) && (
                  <p className="mt-5 flex items-start gap-2 rounded-xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
                    <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                    Recebemos sua mensagem. Uma pessoa do time de {t.category.name} vai responder por aqui. {hours?.online ? "" : "Como estamos fora do horário, a resposta vem no próximo dia útil."}
                  </p>
                )}
                {t.status === "aguardando_colaborador" && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">A equipe aguarda sua resposta para continuar.</p>}
                <ChatLive lastMessageId={messages.at(-1)?.id ?? ""} scrollTargetId="chat-scroll" />
              </>
            ) : (
              <ChatStart categories={categories} firstName={firstName} />
            )}
          </div>

          {t && (
            <div className="border-t border-line bg-surface p-3 sm:p-4">
              {t.actions.canReply ? (
                <ChatComposer number={t.number} />
              ) : (
                <p className="px-1 py-2 text-sm text-muted">
                  A equipe marcou esta conversa como resolvida. Se ainda precisar de ajuda,{" "}
                  <Link href={`/solicitacoes/${t.number}`} className="font-semibold text-brand-700 underline">
                    reabra pela solicitação
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
        </Card>

        <aside className="flex flex-col gap-4" aria-label="Sobre o atendimento">
          {hours && (
            <Card className="flex items-start gap-3 p-5">
              <Clock className="size-6 shrink-0 text-brand-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-ink">Horário de atendimento</h2>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-[0.9375rem] text-muted">
                    {hours.label}
                    <br />
                    {hours.hours}
                  </p>
                  <Badge tone={hours.online ? "green" : "slate"} className="mb-0.5 shrink-0 whitespace-nowrap">
                    {hours.online ? "Online" : "Fora do horário"}
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {t && (
            <Card className="p-5">
              <h2 className="font-bold text-ink">Sobre esta conversa</h2>
              <dl className="mt-2 space-y-2 text-[0.9375rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Protocolo</dt>
                  <dd className="font-semibold text-ink">{fmtTicketNumber(t.number)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Área</dt>
                  <dd className="font-semibold text-ink">{t.category.name}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <SlaMeter sla={t.sla} />
              </div>
              <Link href={`/solicitacoes/${t.number}`} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                Ver como solicitação <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          )}

          {past.length > 0 && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-bold text-ink">
                <History className="size-5 text-brand-600" aria-hidden /> Conversas anteriores
              </h2>
              <ul className="mt-1 divide-y divide-line">
                {past.map((c) => (
                  <li key={c.number}>
                    <Link href={`/solicitacoes/${c.number}`} className="flex min-h-14 items-center gap-3 py-2.5 hover:bg-canvas">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-semibold text-ink">{c.subject}</span>
                        <span className="block text-xs text-muted">
                          {c.category} • {fmtDateLong(c.createdAt)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink/60" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex gap-3">
              <FileText className="size-6 shrink-0 text-blue-600" aria-hidden />
              <div>
                <h2 className="font-bold text-ink">Prefere um formulário?</h2>
                <p className="mt-0.5 text-sm text-muted">Para pedidos com anexos ou mais detalhes, abra uma solicitação completa.</p>
                <Link href="/solicitacoes/nova" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                  Abrir solicitação <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>

          <p className="flex gap-2 px-1 text-sm text-muted">
            <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden /> Só você e a equipe de atendimento autorizada veem esta conversa.
          </p>
        </aside>
      </div>
    </div>
  );
}

function fileList(t: Awaited<ReturnType<typeof getMyTicket>>, messageId: string | null) {
  return t.attachments.filter((a) => a.messageId === messageId).map((a) => ({ id: a.id, name: a.name, sizeBytes: a.sizeBytes, href: `/api/v1/tickets/${t.number}/attachments/${a.id}` }));
}
