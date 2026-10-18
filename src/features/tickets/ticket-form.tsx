"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { iconFor, toTone, TONE } from "@/components/ui/icons";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, fieldErrors } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { ticketCreateSchema } from "@/lib/validation/forms";

type Category = { slug: string; name: string; description: string; color: string; icon: string };

export function TicketForm({
  categories,
  initial,
  fixedCategory,
  submitLabel = "Enviar solicitação",
}: {
  categories: Category[];
  initial?: { draftId?: string; categorySlug?: string; subject?: string; description?: string };
  fixedCategory?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState(fixedCategory ?? initial?.categorySlug ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(initial?.draftId);

  function validate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = ticketCreateSchema.safeParse({ categorySlug: category, subject, description });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setConfirm(true);
  }

  async function send() {
    setSending(true);
    const fd = new FormData();
    fd.set("categorySlug", category);
    fd.set("subject", subject.trim());
    fd.set("description", description.trim());
    if (draftId) fd.set("draftId", draftId);
    files.forEach((f) => fd.append("files", f));
    try {
      const r = await api<{ number: number }>("/tickets", { formData: fd });
      setConfirm(false);
      toast("success", `Solicitação #${String(r.number).padStart(4, "0")} aberta com sucesso.`);
      router.push(`/solicitacoes/${r.number}?criada=1`);
    } catch (err) {
      setConfirm(false);
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
      setSending(false);
    }
  }

  async function saveDraft() {
    setSavingDraft(true);
    setFormError(null);
    try {
      const payload = { categorySlug: category || undefined, subject, description };
      const r = draftId
        ? await api<{ id: string }>(`/ticket-drafts/${draftId}`, { method: "PUT", json: payload })
        : await api<{ id: string }>("/ticket-drafts", { json: payload });
      setDraftId(r.id);
      toast("success", "Rascunho salvo. Você encontra em Solicitações › Rascunhos.");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar o rascunho.");
    } finally {
      setSavingDraft(false);
    }
  }

  const cat = categories.find((c) => c.slug === category);
  return (
    <>
      <form onSubmit={validate} noValidate className="flex flex-col gap-5">
        {formError && <Alert kind="error">{formError}</Alert>}
        {!fixedCategory && (
          <fieldset>
            <legend className="text-sm font-semibold text-ink">
              Para qual área?<span className="ml-0.5 text-red-700" aria-hidden>*</span>
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {categories.map((c) => {
                const Icon = iconFor(c.icon);
                const tone = toTone(c.color);
                return (
                  <label key={c.slug} className={cn("flex min-h-20 cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors", category === c.slug ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas")}>
                    <input type="radio" name="categorySlug" value={c.slug} checked={category === c.slug} onChange={() => setCategory(c.slug)} className="sr-only" />
                    <span className={cn("inline-flex size-10 items-center justify-center rounded-lg", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-bold text-ink">{c.name}</span>
                      <span className="block text-sm text-muted">{c.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.categorySlug && <p className="mt-1.5 text-sm font-medium text-red-700">{errors.categorySlug}</p>}
          </fieldset>
        )}
        <Field label="Assunto" hint="Resuma em poucas palavras. Ex.: Troca de crachá" error={errors.subject} required>
          {({ id, describedBy, invalid, required }) => <Input id={id} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
        </Field>
        <Field label="Descrição" hint="Conte o que você precisa e, se possível, onde e desde quando." error={errors.description} required>
          {({ id, describedBy, invalid, required }) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
        </Field>
        <FileUpload label="Anexos (opcional)" files={files} onChange={setFiles} max={5} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {!fixedCategory && (
            <Button variant="outline" size="lg" onClick={saveDraft} loading={savingDraft} icon={<Save className="size-5" aria-hidden />}>
              Salvar rascunho
            </Button>
          )}
          <Button type="submit" size="lg" icon={<Send className="size-5" aria-hidden />}>
            {submitLabel}
          </Button>
        </div>
      </form>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={send} loading={sending} title="Confirmar envio" description="Revise os dados da sua solicitação." confirmLabel="Confirmar e enviar">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
          <dt className="text-muted">Área</dt>
          <dd className="font-semibold text-ink">{cat?.name}</dd>
          <dt className="text-muted">Assunto</dt>
          <dd className="font-semibold break-words text-ink">{subject}</dd>
          <dt className="text-muted">Anexos</dt>
          <dd className="text-ink">{files.length ? files.map((f) => f.name).join(", ") : "Nenhum"}</dd>
        </dl>
        <p className="mt-4 text-sm text-muted">Você receberá um número de protocolo e poderá acompanhar o prazo previsto.</p>
      </ConfirmDialog>
    </>
  );
}
