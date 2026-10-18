"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

export function ReplyForm({ number, waiting }: { number: number; waiting: boolean }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setError("Escreva sua mensagem.");
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("body", body.trim());
    files.forEach((f) => fd.append("files", f));
    try {
      await api(`/tickets/${number}/messages`, { formData: fd });
      setBody("");
      setFiles([]);
      toast("success", "Mensagem enviada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-labelledby="responder">
      <h2 id="responder" className="text-lg font-bold text-ink">
        {waiting ? "Responder à equipe" : "Enviar mensagem"}
      </h2>
      {waiting && <Alert kind="warning">A equipe aguarda sua resposta. O prazo fica pausado até você responder.</Alert>}
      <Field label="Mensagem" error={error ?? undefined} labelHidden>
        {({ id, describedBy, invalid }) => <Textarea id={id} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem..." maxLength={5000} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <FileUpload label="Anexos (opcional)" files={files} onChange={setFiles} max={5} />
      <div>
        <Button type="submit" loading={busy} icon={<Send className="size-5" aria-hidden />}>
          Enviar mensagem
        </Button>
      </div>
    </form>
  );
}

export function TicketActions({ number, canCancel, canConfirm, canReopen, status }: { number: number; canCancel: boolean; canConfirm: boolean; canReopen: boolean; status: string }) {
  const [dialog, setDialog] = useState<"cancel" | "confirm" | "reopen" | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function run(path: string, json: unknown, ok: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/tickets/${number}/${path}`, { json });
      toast("success", ok);
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  if (!canCancel && !canConfirm && !canReopen) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {canConfirm && (
        <Button onClick={() => setDialog("confirm")} icon={<CircleCheck className="size-5" aria-hidden />}>
          {status === "respondido" ? "Problema resolvido" : "Encerrar solicitação"}
        </Button>
      )}
      {canReopen && (
        <Button variant="outline" onClick={() => setDialog("reopen")} icon={<RotateCcw className="size-5" aria-hidden />}>
          Reabrir
        </Button>
      )}
      {canCancel && (
        <Button variant="outline" onClick={() => setDialog("cancel")} icon={<XCircle className="size-5" aria-hidden />}>
          Cancelar solicitação
        </Button>
      )}
      <ConfirmDialog
        open={dialog === "confirm"}
        onClose={() => setDialog(null)}
        onConfirm={() => run("confirm", {}, "Obrigado! Solicitação encerrada.")}
        loading={busy}
        title="Confirmar que o problema foi resolvido?"
        description="A solicitação será encerrada. Se precisar de algo novo, abra outra solicitação."
        confirmLabel="Sim, foi resolvido"
      >
        {error && <Alert kind="error">{error}</Alert>}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        onConfirm={() => run("cancel", { reason: reason || undefined }, "Solicitação cancelada.")}
        loading={busy}
        tone="danger"
        title="Cancelar esta solicitação?"
        description="A equipe deixará de atender este pedido."
        confirmLabel="Sim, cancelar"
      >
        {error && <Alert kind="error" className="mb-3">{error}</Alert>}
        <Field label="Motivo (opcional)">{({ id }) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="min-h-20" />}</Field>
      </ConfirmDialog>
      <Dialog
        open={dialog === "reopen"}
        onClose={() => setDialog(null)}
        title="Reabrir solicitação"
        description="Conte o que ainda não foi resolvido."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Voltar
            </Button>
            <Button loading={busy} onClick={() => (reason.trim() ? run("reopen", { body: reason.trim() }, "Solicitação reaberta.") : setError("Escreva o motivo da reabertura."))}>
              Reabrir solicitação
            </Button>
          </>
        }
      >
        {error && <Alert kind="error" className="mb-3">{error}</Alert>}
        <Field label="Mensagem">{({ id }) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={5000} />}</Field>
      </Dialog>
    </div>
  );
}

export function DeleteDraftButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <IconButton label="Excluir rascunho" onClick={() => setOpen(true)}>
        <Trash2 className="size-5" aria-hidden />
      </IconButton>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={busy}
        tone="danger"
        title="Excluir rascunho?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/ticket-drafts/${id}`, { method: "DELETE" });
            toast("success", "Rascunho excluído.");
            setOpen(false);
            router.refresh();
          } catch (err) {
            toast("error", err instanceof ApiError ? err.message : "Não foi possível excluir.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
