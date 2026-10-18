"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleCheck, Send } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Alert } from "@/components/ui/primitives";
import { api, ApiError, fieldErrors } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { fmtFileSize } from "@/lib/format";
import { submissionCreateSchema } from "@/lib/validation/forms";

type Cat = { slug: string; name: string; description: string | null };

export function SubmissionForm({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ id: string; number: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState<Record<string, string>>({});

  function validate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = submissionCreateSchema.safeParse({ ...data, categorySlug: category });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (!files[0]) errs.file = "Selecione um arquivo.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(data);
    setConfirming(true);
  }

  async function send() {
    setSending(true);
    const fd = new FormData();
    fd.set("categorySlug", category);
    for (const k of ["title", "notes", "referenceDate"]) if (pending[k]) fd.set(k, pending[k]);
    fd.set("file", files[0]);
    try {
      const r = await api<{ id: string; number: number }>("/submissions", { formData: fd });
      setConfirming(false);
      setDone(r);
      router.refresh();
    } catch (err) {
      setConfirming(false);
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-6 text-center" role="status">
        <CircleCheck className="mx-auto size-12 text-brand-600" aria-hidden />
        <p className="mt-3 text-xl font-bold text-ink">Documento enviado!</p>
        <p className="mt-1 text-[0.9375rem] text-muted">
          Protocolo <strong className="text-ink">DOC-{done.number}</strong>. O RH vai analisar e você acompanha a situação por aqui.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <ButtonLink href={`/documentos/envios/${done.id}`}>Acompanhar envio</ButtonLink>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setFiles([]);
              setCategory("");
              formRef.current?.reset();
            }}
          >
            Enviar outro documento
          </Button>
        </div>
      </div>
    );
  }

  const catName = categories.find((c) => c.slug === category)?.name;
  return (
    <>
      <form ref={formRef} onSubmit={validate} noValidate className="flex flex-col gap-5">
        {formError && <Alert kind="error">{formError}</Alert>}
        <fieldset>
          <legend className="text-sm font-semibold text-ink">
            Tipo de documento<span className="ml-0.5 text-red-700" aria-hidden>*</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-describedby={errors.categorySlug ? "cat-error" : undefined}>
            {categories.map((c) => (
              <label key={c.slug} className={cn("flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors", category === c.slug ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas")}>
                <input type="radio" name="categorySlugRadio" value={c.slug} checked={category === c.slug} onChange={() => setCategory(c.slug)} className="mt-1 size-5 accent-[var(--color-brand-700)]" />
                <span>
                  <span className="block font-semibold text-ink">{c.name}</span>
                  {c.description && <span className="block text-sm text-muted">{c.description}</span>}
                </span>
              </label>
            ))}
          </div>
          {errors.categorySlug && (
            <p id="cat-error" className="mt-1.5 text-sm font-medium text-red-700">
              {errors.categorySlug}
            </p>
          )}
        </fieldset>
        <Field label="Nome do documento" hint="Ex.: Atestado médico - consulta de 12/10" error={errors.title} required>
          {({ id, describedBy, invalid, required }) => <Input id={id} name="title" maxLength={120} aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
        </Field>
        <Field label="Data a que o documento se refere" hint="Opcional. Ex.: data do atestado." error={errors.referenceDate}>
          {({ id, describedBy, invalid }) => <Input id={id} name="referenceDate" type="date" aria-describedby={describedBy} invalid={invalid} className="sm:max-w-xs" />}
        </Field>
        <Field label="Observações para o RH" hint="Opcional." error={errors.notes}>
          {({ id, describedBy, invalid }) => <Textarea id={id} name="notes" maxLength={1000} rows={3} aria-describedby={describedBy} invalid={invalid} className="min-h-24" />}
        </Field>
        <FileUpload label="Arquivo" files={files} onChange={setFiles} error={errors.file} required />
        <div>
          <Button type="submit" size="lg" icon={<Send className="size-5" aria-hidden />} className="w-full sm:w-auto">
            Revisar e enviar
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={send}
        loading={sending}
        title="Confirmar envio ao RH"
        description="Confira os dados antes de enviar."
        confirmLabel="Confirmar envio"
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
          <dt className="text-muted">Tipo</dt>
          <dd className="font-semibold text-ink">{catName}</dd>
          <dt className="text-muted">Nome</dt>
          <dd className="font-semibold break-words text-ink">{pending.title}</dd>
          <dt className="text-muted">Arquivo</dt>
          <dd className="font-semibold break-all text-ink">
            {files[0]?.name} ({files[0] ? fmtFileSize(files[0].size) : ""})
          </dd>
        </dl>
        <p className="mt-4 text-sm text-muted">
          Seus dados são tratados com sigilo e acessados apenas pelo RH autorizado. Veja a{" "}
          <Link href="/ajuda/artigos/como-enviar-um-atestado" className="font-semibold text-brand-600 underline">
            orientação de envio
          </Link>
          .
        </p>
      </ConfirmDialog>
    </>
  );
}
