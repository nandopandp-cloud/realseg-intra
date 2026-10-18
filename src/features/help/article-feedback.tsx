"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

/** Conta um acesso por sessão de navegação (agregado e anônimo). */
export function ArticleViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `rs-view-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    api(`/help/articles/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}

export function ArticleFeedback({ slug, initial }: { slug: string; initial: boolean | null }) {
  const [vote, setVote] = useState<boolean | null>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function send(helpful: boolean) {
    setBusy(true);
    try {
      await api(`/help/articles/${slug}/feedback`, { json: { helpful } });
      setVote(helpful);
      setMsg("Obrigado pelo retorno!");
    } catch {
      setMsg("Não foi possível registrar agora.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-[var(--radius-card)] border border-line p-5">
      <p className="font-semibold text-ink" id="util">
        Este artigo foi útil?
      </p>
      <div className="mt-3 flex gap-2" role="group" aria-labelledby="util">
        <Button variant={vote === true ? "secondary" : "outline"} aria-pressed={vote === true} disabled={busy} onClick={() => send(true)} icon={<ThumbsUp className="size-5" aria-hidden />}>
          Sim
        </Button>
        <Button variant={vote === false ? "secondary" : "outline"} aria-pressed={vote === false} disabled={busy} onClick={() => send(false)} icon={<ThumbsDown className="size-5" aria-hidden />}>
          Não
        </Button>
      </div>
      <p className="mt-2 min-h-5 text-sm text-muted" role="status">
        {msg}
      </p>
    </div>
  );
}
