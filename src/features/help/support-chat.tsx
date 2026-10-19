"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, Paperclip, SendHorizontal, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ArticleSuggestions } from "@/features/help/article-suggestions";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type Category = { slug: string; name: string; description: string; color: string; icon: string };

/** Enter envia; Shift+Enter quebra linha (padrão de chat). */
function useEnterToSend(send: () => void) {
  return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };
}

/** Início da conversa: escolha do assunto + primeira mensagem (com artigos sugeridos enquanto digita). */
export function ChatStart({ categories, firstName }: { categories: Category[]; firstName: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy) return;
    if (!category) return setError("Escolha sobre o que você quer falar.");
    if (message.trim().length < 4) return setError("Escreva sua mensagem (pelo menos 4 caracteres).");
    setBusy(true);
    setError(null);
    try {
      await api("/support-chat", { json: { categorySlug: category, message: message.trim() } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar a conversa.");
      setBusy(false);
    }
  }
  const onKeyDown = useEnterToSend(send);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-950" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- símbolo oficial estático */}
          <img src="/logo/symbol-on-dark.svg" alt="" width={20} height={16} />
        </span>
        <div className="max-w-[min(36rem,86%)]">
          <p className="mb-1 px-1 text-xs text-muted">
            <strong className="font-semibold text-ink">Assistente REALSEG</strong> · mensagem automática
          </p>
          <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[0.9375rem] leading-relaxed text-ink shadow-[var(--shadow-card)]">
            Olá, {firstName}! Sobre o que você quer falar? Escolha um assunto e escreva sua mensagem. Uma pessoa do nosso time responde por aqui, e a conversa fica registrada nas suas solicitações.
          </div>
        </div>
      </div>

      <fieldset className="pl-0 sm:pl-11">
        <legend className="mb-2 text-sm font-semibold text-ink">Assunto da conversa</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const Icon = iconFor(c.icon);
            const tone = toTone(c.color);
            const on = category === c.slug;
            return (
              <label key={c.slug} className={cn("inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500", on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line bg-surface text-ink hover:bg-canvas")}>
                <input type="radio" name="chat-category" value={c.slug} checked={on} onChange={() => setCategory(c.slug)} className="sr-only" />
                <Icon className={cn("size-4", TONE[tone].icon)} aria-hidden />
                {c.name}
                <span className="sr-only">: {c.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="sm:pl-11">
        {error && (
          <Alert kind="error" className="mb-3">
            {error}
          </Alert>
        )}
        <Composer value={message} onChange={setMessage} onSend={send} onKeyDown={onKeyDown} busy={busy} placeholder="Escreva sua mensagem…" label="Primeira mensagem" />
        <ArticleSuggestions text={message} className="mt-3" />
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onKeyDown,
  busy,
  placeholder,
  label,
  files,
  onFiles,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  busy: boolean;
  placeholder: string;
  label: string;
  files?: File[];
  onFiles?: (f: File[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-card)] focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      {files && files.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas py-1 pr-1 pl-2.5 text-sm text-ink">
              <Paperclip className="size-3.5" aria-hidden /> <span className="max-w-[12rem] truncate">{f.name}</span>
              <button type="button" onClick={() => onFiles?.(files.filter((_, j) => j !== i))} className="inline-flex size-7 items-center justify-center rounded-md hover:bg-line" aria-label={`Remover ${f.name}`}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-1">
        {onFiles && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                onFiles([...(files ?? []), ...Array.from(e.target.files ?? [])].slice(0, 5));
                e.target.value = "";
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-canvas hover:text-ink" aria-label="Anexar arquivo (PDF, JPG ou PNG, até 10 MB)">
              <Paperclip className="size-5" aria-hidden />
            </button>
          </>
        )}
        <label className="sr-only" htmlFor="chat-message">
          {label}
        </label>
        <textarea
          id="chat-message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder={placeholder}
          className="max-h-40 min-h-11 flex-1 resize-none [field-sizing:content] bg-transparent px-2 py-2.5 text-[1rem] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white hover:bg-brand-800 disabled:bg-slate-200 disabled:text-slate-500"
          aria-label="Enviar mensagem"
        >
          <SendHorizontal className="size-5" aria-hidden />
        </button>
      </div>
      <p className="px-2 pt-1 text-xs text-muted">Enter envia · Shift + Enter quebra a linha</p>
    </div>
  );
}

/** Campo de mensagem de uma conversa em andamento (texto + até 5 anexos). */
export function ChatComposer({ number }: { number: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("body", body.trim());
    files.forEach((f) => fd.append("files", f));
    try {
      await api(`/tickets/${number}/messages`, { formData: fd });
      setBody("");
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }
  const onKeyDown = useEnterToSend(send);

  return (
    <div>
      {error && (
        <Alert kind="error" className="mb-2">
          {error}
        </Alert>
      )}
      <Composer value={body} onChange={setBody} onSend={send} onKeyDown={onKeyDown} busy={busy} placeholder="Escreva sua mensagem…" label="Mensagem" files={files} onFiles={setFiles} />
    </div>
  );
}

/** Encerrar a conversa: confirma a solução (se já houve resposta) ou cancela o pedido. */
export function EndChatButton({ number, canConfirm, canCancel }: { number: number; canConfirm: boolean; canCancel: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canConfirm && !canCancel) return null;

  async function end() {
    setBusy(true);
    setError(null);
    try {
      if (canConfirm) await api(`/tickets/${number}/confirm`, { json: {} });
      else await api(`/tickets/${number}/cancel`, { json: { reason: "Conversa encerrada pelo colaborador no chat." } });
      toast("success", "Conversa encerrada. Ela continua no seu histórico de solicitações.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível encerrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} icon={canConfirm ? <CircleCheck className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}>
        Encerrar conversa
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={end}
        loading={busy}
        tone={canConfirm ? undefined : "danger"}
        title={canConfirm ? "Sua dúvida foi resolvida?" : "Encerrar a conversa sem resposta?"}
        description={canConfirm ? "A conversa será encerrada e registrada como resolvida." : "A equipe ainda não respondeu. Ao encerrar, o pedido é cancelado."}
        confirmLabel={canConfirm ? "Sim, foi resolvida" : "Encerrar conversa"}
      >
        {error && <Alert kind="error">{error}</Alert>}
      </ConfirmDialog>
    </>
  );
}

/**
 * Atualiza a conversa periodicamente enquanto a aba está visível (novas respostas aparecem sozinhas),
 * e rola até a última mensagem quando chega conteúdo novo.
 */
export function ChatLive({ intervalMs = 8000, lastMessageId, scrollTargetId }: { intervalMs?: number; lastMessageId: string; scrollTargetId: string }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  useEffect(() => {
    const el = document.getElementById(scrollTargetId);
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lastMessageId, scrollTargetId]);
  return null;
}
