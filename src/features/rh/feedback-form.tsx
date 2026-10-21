"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Switch, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { feedbackSchema } from "@/lib/validation/rh";
import { EmployeePicker, type PickedEmployee } from "./employee-picker";

type Type = "feedback" | "avaliacao" | "reconhecimento";
export type FeedbackValue = { employee: PickedEmployee | null; type: Type; title: string; cycle: string; body: string; authorContext: string; showAuthor: boolean };

const TYPES: Array<{ value: Type; label: string; text: string }> = [
  { value: "reconhecimento", label: "Reconhecimento", text: "Elogio por uma entrega ou atitude." },
  { value: "feedback", label: "Feedback", text: "Orientação para desenvolvimento." },
  { value: "avaliacao", label: "Avaliação", text: "Resultado de ciclo de avaliação." },
];

/**
 * Registro de feedback para um colaborador. Só o colaborador (e quem gerencia) lê o conteúdo;
 * a notificação nunca traz o texto. Editar um publicado reinicia a confirmação de leitura.
 */
export function FeedbackForm({ id, status, initial }: { id?: string; status?: "rascunho" | "publicado" | "arquivado"; initial: FeedbackValue }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "archive" | null>(null);
  const set = <K extends keyof FeedbackValue>(k: K, val: FeedbackValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const readonly = status === "arquivado";

  function payload() {
    const parsed = feedbackSchema.safeParse({ ...v, employeeId: v.employee?.id, cycle: v.cycle || null });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      setFormError("Revise os campos destacados.");
      return null;
    }
    setErrors({});
    setFormError(null);
    return parsed.data;
  }

  async function submit(publish: boolean) {
    const data = payload();
    if (!data) return setConfirm(null);
    setBusy(publish ? "publish" : "save");
    try {
      if (!id) {
        const r = await api<{ id: string }>("/rh/feedbacks", { json: { ...data, publish } });
        toast("success", publish ? "Feedback publicado. O colaborador foi avisado." : "Rascunho salvo.");
        router.push(`/rh/feedbacks/${r.id}`);
      } else {
        await api(`/rh/feedbacks/${id}`, { method: "PUT", json: data });
        if (publish && status === "rascunho") await api(`/rh/feedbacks/${id}/publish`, { method: "POST" });
        toast("success", publish ? "Feedback publicado. O colaborador foi avisado." : status === "publicado" ? "Alterações publicadas. A confirmação de leitura foi reiniciada." : "Rascunho salvo.");
        router.refresh();
      }
      setConfirm(null);
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k, m[0]])));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function archive() {
    setBusy("archive");
    try {
      const r = await api<{ deleted: boolean }>(`/rh/feedbacks/${id}/archive`, { method: "POST" });
      toast("success", r.deleted ? "Rascunho excluído." : "Feedback arquivado.");
      router.push("/rh/feedbacks");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {formError && <Alert kind="error">{formError}</Alert>}
      {readonly && <Alert kind="info">Feedback arquivado: não aparece mais para o colaborador.</Alert>}
      <Card className="flex flex-col gap-5 p-5">
        {status === "publicado" || readonly ? (
          <div>
            <p className="text-sm font-semibold text-ink">Colaborador</p>
            <p className="mt-1 text-[0.9375rem]">
              {v.employee?.name} {v.employee?.registration && <span className="text-muted">· {v.employee.registration}</span>}
            </p>
          </div>
        ) : (
          <EmployeePicker value={v.employee} onChange={(e) => set("employee", e)} error={errors.employeeId} required />
        )}
        <fieldset disabled={readonly}>
          <legend className="text-sm font-semibold text-ink">Tipo</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <label key={t.value} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border p-3", v.type === t.value ? "border-brand-600 bg-brand-50" : "border-line")}>
                <input type="radio" name="fb-type" checked={v.type === t.value} onChange={() => set("type", t.value)} className="mt-1 size-4 accent-[var(--color-brand-700)]" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{t.label}</span>
                  <span className="block text-xs text-muted">{t.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Título" error={errors.title} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={140} disabled={readonly} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label="Ciclo" hint="Opcional. Ex.: Ciclo 2026.2" error={errors.cycle}>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.cycle} onChange={(e) => set("cycle", e.target.value)} maxLength={60} disabled={readonly} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
        </div>
        <Field label="Texto" error={errors.body} required>
          {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.body} onChange={(e) => set("body", e.target.value)} maxLength={10000} rows={8} disabled={readonly} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assinatura exibida" hint="Ex.: Gestão imediata, Recursos Humanos." error={errors.authorContext} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.authorContext} onChange={(e) => set("authorContext", e.target.value)} maxLength={80} disabled={readonly} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Switch checked={v.showAuthor} onChange={(b) => set("showAuthor", b)} label="Mostrar meu nome" description="Se desligado, o colaborador vê só a assinatura." disabled={readonly} />
        </div>
      </Card>
      {!readonly && (
        <div className="flex flex-wrap gap-2">
          {status !== "publicado" && (
            <Button size="lg" onClick={() => setConfirm("publish")} icon={<Send className="size-5" aria-hidden />}>
              Publicar para o colaborador
            </Button>
          )}
          <Button size="lg" variant={status === "publicado" ? "primary" : "outline"} onClick={() => submit(false)} loading={busy === "save"} icon={<Save className="size-5" aria-hidden />}>
            {status === "publicado" ? "Salvar e publicar alterações" : "Salvar rascunho"}
          </Button>
          {id && (
            <Button size="lg" variant="ghost" onClick={() => setConfirm("archive")} icon={<Archive className="size-5" aria-hidden />}>
              {status === "rascunho" ? "Excluir rascunho" : "Arquivar"}
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm === "publish"}
        onClose={() => setConfirm(null)}
        onConfirm={() => submit(true)}
        loading={busy === "publish"}
        title="Publicar feedback?"
        description={`${v.employee?.name ?? "O colaborador"} poderá ler em Minha carreira › Avaliações e será avisado (sem o conteúdo na notificação).`}
        confirmLabel="Publicar"
      />
      <ConfirmDialog
        open={confirm === "archive"}
        onClose={() => setConfirm(null)}
        onConfirm={archive}
        loading={busy === "archive"}
        tone="danger"
        title={status === "rascunho" ? "Excluir rascunho?" : "Arquivar feedback?"}
        description={status === "rascunho" ? "O rascunho será excluído." : "O colaborador deixa de ver este feedback. O registro é mantido."}
        confirmLabel={status === "rascunho" ? "Excluir" : "Arquivar"}
      />
    </div>
  );
}
