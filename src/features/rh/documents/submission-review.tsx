"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, CircleX, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

/** Análise de envio: iniciar análise, aceitar (observação opcional) ou recusar (motivo obrigatório). */
export function SubmissionReview({ id, status, version }: { id: string; status: string; version: number }) {
  const [dialog, setDialog] = useState<"accept" | "refuse" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const open = status === "enviado" || status === "em_analise";

  async function act(action: "start" | "accept" | "refuse") {
    if (action === "refuse" && !note.trim()) return setError("Explique ao colaborador o que precisa ser corrigido.");
    setBusy(true);
    setError(null);
    try {
      await api(`/rh/submissions/${id}/review`, { json: { action, note: note.trim() || undefined, version } });
      toast("success", action === "start" ? "Análise iniciada." : action === "accept" ? "Envio aceito. O colaborador foi avisado." : "Envio recusado. O colaborador foi avisado.");
      setDialog(null);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="flex flex-col gap-2">
      {error && !dialog && <Alert kind="error">{error}</Alert>}
      {status === "enviado" && (
        <Button variant="outline" onClick={() => act("start")} loading={busy && !dialog} icon={<ScanSearch className="size-5" aria-hidden />}>
          Iniciar análise
        </Button>
      )}
      <Button onClick={() => setDialog("accept")} icon={<CircleCheck className="size-5" aria-hidden />}>
        Aceitar
      </Button>
      <Button variant="danger" onClick={() => setDialog("refuse")} icon={<CircleX className="size-5" aria-hidden />}>
        Recusar
      </Button>
      <Dialog
        open={!!dialog}
        onClose={() => {
          setDialog(null);
          setError(null);
        }}
        title={dialog === "accept" ? "Aceitar envio" : "Recusar envio"}
        description={dialog === "accept" ? "O colaborador será avisado de que o documento foi aceito." : "O colaborador verá o motivo e poderá enviar o documento corrigido."}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>
              Voltar
            </Button>
            <Button variant={dialog === "refuse" ? "danger" : "primary"} onClick={() => act(dialog!)} loading={busy}>
              {dialog === "accept" ? "Aceitar" : "Recusar envio"}
            </Button>
          </>
        }
      >
        <Field label={dialog === "accept" ? "Observação para o colaborador (opcional)" : "Motivo da recusa"} required={dialog === "refuse"} error={error ?? undefined}>
          {({ id: fid, describedBy, invalid }) => (
            <Textarea id={fid} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={4} className="min-h-28" aria-describedby={describedBy} invalid={invalid} placeholder={dialog === "refuse" ? "Ex.: O atestado está ilegível. Envie uma foto nítida e completa." : ""} />
          )}
        </Field>
      </Dialog>
    </div>
  );
}
