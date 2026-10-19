import { Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtFileSize } from "@/lib/format";

export type ConversationMessage = {
  id: string;
  mine: boolean;
  authorName: string | null;
  body: string;
  createdAt: Date;
  attachments: Array<{ id: string; name: string; sizeBytes: number; href: string }>;
};

/**
 * Conversa de uma solicitação em bolhas: suas mensagens à direita, as do atendimento à esquerda com avatar.
 * Datas e autoria sempre em texto (não só pela posição/cor).
 */
export function Conversation({ messages, label = "Conversa" }: { messages: ConversationMessage[]; label?: string }) {
  return (
    <ol className="flex flex-col gap-4" aria-label={label}>
      {messages.map((m) => (
        <li key={m.id} className={cn("flex items-end gap-2.5", m.mine ? "flex-row-reverse" : "flex-row")}>
          {!m.mine && <Avatar name={m.authorName ?? "Atendimento"} size="sm" className="shrink-0" />}
          <div className={cn("flex max-w-[min(36rem,86%)] flex-col", m.mine ? "items-end" : "items-start")}>
            <p className="mb-1 px-1 text-xs text-muted">
              <strong className="font-semibold text-ink">{m.mine ? "Você" : (m.authorName ?? "Atendimento")}</strong>
              {!m.mine && " · atendimento"} · {fmtDateTime(m.createdAt)}
            </p>
            <div className={cn("rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink", m.mine ? "rounded-br-md bg-brand-50 ring-1 ring-brand-100" : "rounded-bl-md border border-line bg-surface shadow-[var(--shadow-card)]")}>
              {m.body}
              {m.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {m.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={a.href} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-canvas">
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
  );
}
