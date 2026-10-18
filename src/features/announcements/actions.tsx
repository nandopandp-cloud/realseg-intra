"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookmarkCheck, Bookmark, CircleCheck, Download, FileCheck, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { fmtDateTime } from "@/lib/format";

/** Registra a visualização ao abrir (não confirma ciência). */
export function MarkAnnouncementRead({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    api(`/announcements/${id}/read`, { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});
  }, [id, router]);
  return null;
}

export function FavoriteButton({ id, initial, className }: { id: string; initial: boolean; className?: string }) {
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function toggle() {
    setBusy(true);
    try {
      await api(`/announcements/${id}/favorite`, { method: fav ? "DELETE" : "PUT" });
      setFav(!fav);
      toast("success", fav ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" onClick={toggle} loading={busy} aria-pressed={fav} className={className} icon={fav ? <BookmarkCheck className="size-5 text-brand-600" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}>
      {fav ? "Favoritado" : "Favoritar"}
    </Button>
  );
}

/** Confirmação formal de ciência (ação explícita e separada da leitura). */
export function AcknowledgeBox({ endpoint, acknowledgedAt, subject }: { endpoint: string; acknowledgedAt: string | null; subject: "comunicado" | "documento" | "feedback" }) {
  const [at, setAt] = useState(acknowledgedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  if (at) {
    return (
      <Alert kind="success" title={subject === "feedback" ? "Leitura confirmada" : "Ciência confirmada"}>
        Você confirmou em {fmtDateTime(at)}.
      </Alert>
    );
  }
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ acknowledgedAt: string }>(endpoint, { method: "POST" });
      setAt(r.acknowledgedAt ?? new Date().toISOString());
      toast("success", subject === "feedback" ? "Leitura confirmada." : "Ciência confirmada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível confirmar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-5">
      <div className="flex gap-3">
        <FileCheck className="mt-0.5 size-6 shrink-0 text-brand-600" aria-hidden />
        <div>
          <p className="font-bold text-ink">{subject === "feedback" ? "Confirme que você leu este feedback" : `Este ${subject} exige confirmação de ciência`}</p>
          <p className="mt-1 text-[0.9375rem] text-muted">
            {subject === "feedback"
              ? "Confirmar a leitura não significa que você concorda com o conteúdo."
              : "Abrir ou baixar não confirma automaticamente. Confirmar ciência significa que você leu o conteúdo — não significa concordância."}
          </p>
          {error && <Alert kind="error" className="mt-3">{error}</Alert>}
          <Button onClick={confirm} loading={busy} className="mt-4" icon={<CircleCheck className="size-5" aria-hidden />}>
            {subject === "feedback" ? "Confirmar leitura" : "Confirmar ciência"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Compartilhar: menu nativo do celular quando existe; senão copia o link (só abre para quem tem acesso). */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const toast = useToast();
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* cancelado pelo usuário */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Link copiado. Ele só abre para quem tem acesso a este comunicado.");
    } catch {
      toast("error", "Não foi possível copiar o link.");
    }
  }
  return (
    <Button variant="outline" onClick={share} className={className} icon={<Share2 className="size-5" aria-hidden />}>
      Compartilhar
    </Button>
  );
}

/** Baixa todos os anexos em sequência (cada download continua autorizado e auditado no servidor). */
export function DownloadAllButton({ urls }: { urls: string[] }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    for (const url of urls) {
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 400));
    }
    setBusy(false);
  }
  return (
    <button type="button" onClick={run} disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-brand-600 hover:underline disabled:opacity-60">
      <Download className="size-4" aria-hidden /> Baixar todos
    </button>
  );
}
