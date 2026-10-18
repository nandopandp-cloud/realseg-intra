"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

export function ApplyActions({ id, status }: { id: string; status: string | null }) {
  const [dialog, setDialog] = useState<"apply" | "withdraw" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const active = status && status !== "retirada";

  async function run(kind: "apply" | "withdraw") {
    setBusy(true);
    setError(null);
    try {
      await api(`/opportunities/${id}/${kind}`, kind === "apply" ? { json: { message: message || undefined } } : { method: "POST" });
      toast("success", kind === "apply" ? "Candidatura enviada! O RH entrará em contato." : "Candidatura retirada.");
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {active ? (
        <div className="flex flex-col gap-3">
          <Alert kind="success" title="Você se candidatou a esta vaga">O RH analisará seu perfil e entrará em contato.</Alert>
          {status === "enviada" && (
            <Button variant="outline" onClick={() => setDialog("withdraw")}>
              Retirar candidatura
            </Button>
          )}
        </div>
      ) : (
        <Button size="lg" onClick={() => setDialog("apply")} icon={<Send className="size-5" aria-hidden />} className="w-full sm:w-auto">
          Quero me candidatar
        </Button>
      )}
      <ConfirmDialog open={dialog === "apply"} onClose={() => setDialog(null)} onConfirm={() => run("apply")} loading={busy} title="Confirmar candidatura" description="Seu gestor e o RH poderão ver que você se candidatou." confirmLabel="Enviar candidatura">
        {error && <Alert kind="error" className="mb-3">{error}</Alert>}
        <Field label="Mensagem para o RH (opcional)" hint="Conte por que você se interessa pela vaga.">
          {({ id: fid, describedBy }) => <Textarea id={fid} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} aria-describedby={describedBy} className="min-h-24" />}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "withdraw"} onClose={() => setDialog(null)} onConfirm={() => run("withdraw")} loading={busy} tone="danger" title="Retirar candidatura?" description="Você poderá se candidatar novamente enquanto a vaga estiver aberta." confirmLabel="Retirar">
        {error && <Alert kind="error">{error}</Alert>}
      </ConfirmDialog>
    </>
  );
}
