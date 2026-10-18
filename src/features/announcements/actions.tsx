"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookmarkCheck, Bookmark, CircleCheck, FileCheck } from "lucide-react";
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

export function FavoriteButton({ id, initial }: { id: string; initial: boolean }) {
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
    <Button variant="outline" onClick={toggle} loading={busy} aria-pressed={fav} icon={fav ? <BookmarkCheck className="size-5 text-brand-600" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}>
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
