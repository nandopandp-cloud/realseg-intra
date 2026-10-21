"use client";

import Link from "@/components/ui/app-link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert, CircleCheck, FileUp, LoaderCircle, Send, Users } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Alert, Badge, ProgressBar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, fieldErrors } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { EmployeePicker, type PickedEmployee } from "../employee-picker";

type Category = { slug: string; name: string; description: string | null };
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const periodLabel = (p: string) => (/^\d{4}-\d{2}$/.test(p) ? `${MONTHS[Number(p.slice(5)) - 1]}/${p.slice(0, 4)}` : "");

/** Distribuição individual: um arquivo para um colaborador. */
export function DistributeOne({ categories, initialEmployee }: { categories: Category[]; initialEmployee?: PickedEmployee | null }) {
  const [employee, setEmployee] = useState<PickedEmployee | null>(initialEmployee ?? null);
  const [category, setCategory] = useState(categories[0]?.slug ?? "");
  const [period, setPeriod] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; title: string } | null>(null);
  const catName = categories.find((c) => c.slug === category)?.name ?? "";
  const autoTitle = `${catName}${period ? ` - ${periodLabel(period)}` : ""}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!employee) errs.employeeId = "Escolha o colaborador.";
    if (!category) errs.categorySlug = "Escolha o tipo de documento.";
    if (!files[0]) errs.file = "Selecione o arquivo.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFormError(null);
    const fd = new FormData();
    fd.set("employeeId", employee!.id);
    fd.set("categorySlug", category);
    if (title.trim()) fd.set("title", title.trim());
    if (description.trim()) fd.set("description", description.trim());
    if (period) fd.set("referencePeriod", period);
    fd.set("requiresAck", String(requiresAck));
    fd.set("file", files[0]);
    try {
      setDone(await api<{ id: string; title: string }>("/rh/documents/personal", { formData: fd }));
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-6 text-center" role="status">
        <CircleCheck className="mx-auto size-12 text-brand-600" aria-hidden />
        <p className="mt-3 text-xl font-bold text-ink">Documento enviado para {employee?.name}</p>
        <p className="mt-1 text-muted">“{done.title}” já está em Meus documentos e o colaborador foi avisado.</p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <ButtonLink href={`/rh/documentos/${done.id}`} variant="outline">
            Ver documento
          </ButtonLink>
          <Button
            onClick={() => {
              setDone(null);
              setFiles([]);
              setTitle("");
              setDescription("");
              setEmployee(null);
            }}
          >
            Enviar outro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {formError && <Alert kind="error">{formError}</Alert>}
      <EmployeePicker value={employee} onChange={setEmployee} error={errors.employeeId} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de documento" error={errors.categorySlug} required>
          {({ id, describedBy, invalid }) => (
            <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)} aria-describedby={describedBy} invalid={invalid}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Competência (mês/ano)" hint="Opcional. Ex.: holerite de setembro." error={errors.referencePeriod}>
          {({ id, describedBy, invalid }) => <Input id={id} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </div>
      <Field label="Título" hint={`Opcional. Se vazio: “${autoTitle || "tipo do documento"}”.`} error={errors.title}>
        {({ id, describedBy, invalid }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder={autoTitle} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label="Descrição" hint="Opcional. Aparece no detalhe do documento." error={errors.description}>
        {({ id, describedBy, invalid }) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} className="min-h-20" aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Switch checked={requiresAck} onChange={setRequiresAck} label="Exige confirmação de ciência" description="Ex.: advertências, alterações contratuais e comunicados individuais." />
      <FileUpload label="Arquivo" files={files} onChange={setFiles} error={errors.file} required allowCamera={false} />
      <div>
        <Button type="submit" size="lg" loading={busy} icon={<Send className="size-5" aria-hidden />}>
          Enviar ao colaborador
        </Button>
      </div>
    </form>
  );
}

type Match = { name: string; ok: true; employee: { id: string; name: string; registration: string } } | { name: string; ok: false; reason: string };
type RowState = { status: "pending" | "sending" | "sent" | "error"; message?: string };

/**
 * Distribuição em lote (ex.: holerites do mês). Cada arquivo é associado ao colaborador pela matrícula no nome.
 * O envio é feito arquivo a arquivo (limite de tamanho por requisição), com progresso e erros por linha.
 */
export function DistributeBatch({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState(categories[0]?.slug ?? "");
  const [period, setPeriod] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valid = matches?.filter((m): m is Extract<Match, { ok: true }> => m.ok) ?? [];
  const sent = Object.values(rows).filter((r) => r.status === "sent").length;
  const finished = busy === null && Object.keys(rows).length > 0;

  async function preview() {
    setError(null);
    if (!files.length) return setError("Selecione os arquivos.");
    if (!period) return setError("Informe a competência (mês/ano) do lote.");
    setBusy("preview");
    try {
      const r = await api<{ items: Match[] }>("/rh/documents/batch-preview", { json: { names: files.map((f) => f.name) } });
      setMatches(r.items);
      setRows({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível conferir os arquivos.");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    for (const m of valid) {
      if (rows[m.name]?.status === "sent") continue;
      setRows((r) => ({ ...r, [m.name]: { status: "sending" } }));
      const file = files.find((f) => f.name === m.name)!;
      const fd = new FormData();
      fd.set("employeeId", m.employee.id);
      fd.set("categorySlug", category);
      fd.set("referencePeriod", period);
      fd.set("requiresAck", String(requiresAck));
      fd.set("file", file);
      try {
        await api("/rh/documents/personal", { formData: fd });
        setRows((r) => ({ ...r, [m.name]: { status: "sent" } }));
      } catch (err) {
        setRows((r) => ({ ...r, [m.name]: { status: "error", message: err instanceof ApiError ? err.message : "Falha no envio." } }));
      }
    }
    setBusy(null);
    toast("success", "Distribuição concluída. Confira o resultado de cada arquivo.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Alert kind="info" title="Como nomear os arquivos">
        Inclua a matrícula do colaborador no nome do arquivo, por exemplo <code>100231_holerite_2026-09.pdf</code>. Cada arquivo vai apenas para o colaborador daquela matrícula.
      </Alert>
      {error && <Alert kind="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de documento" required>
          {({ id }) => (
            <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!matches}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Competência (mês/ano)" required>
          {({ id }) => <Input id={id} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} disabled={!!matches} />}
        </Field>
      </div>
      <Switch checked={requiresAck} onChange={setRequiresAck} label="Exige confirmação de ciência" disabled={!!matches} />
      {!matches ? (
        <>
          <FileUpload label="Arquivos do lote" files={files} onChange={setFiles} max={300} allowCamera={false} hint="PDF, JPG ou PNG, até 10 MB cada. Até 300 arquivos." />
          <div>
            <Button onClick={preview} loading={busy === "preview"} icon={<Users className="size-5" aria-hidden />}>
              Conferir destinatários
            </Button>
          </div>
        </>
      ) : (
        <section aria-labelledby="lote-previa">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="lote-previa" className="text-lg font-bold text-ink">
              {valid.length} de {matches.length} arquivos prontos para envio
            </h2>
            {!finished && busy === null && (
              <Button variant="ghost" size="sm" onClick={() => setMatches(null)}>
                Trocar arquivos
              </Button>
            )}
          </div>
          {busy === "send" || finished ? <ProgressBar value={valid.length ? Math.round((sent / valid.length) * 100) : 0} label={`${sent} de ${valid.length} enviados`} className="mt-3" /> : null}
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {matches.map((m) => {
              const st = rows[m.name];
              return (
                <li key={m.name} className={cn("flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4", !m.ok && "bg-red-50/50")}>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{m.name}</span>
                  <span className="text-sm sm:w-72">{m.ok ? `${m.employee.name} · ${m.employee.registration}` : <span className="text-red-700">{m.reason}</span>}</span>
                  <span className="sm:w-28 sm:text-right">
                    {!m.ok ? (
                      <Badge tone="red">Não será enviado</Badge>
                    ) : st?.status === "sent" ? (
                      <Badge tone="green">Enviado</Badge>
                    ) : st?.status === "sending" ? (
                      <LoaderCircle className="inline size-5 animate-spin text-brand-600" aria-label="Enviando" />
                    ) : st?.status === "error" ? (
                      <span className="inline-flex items-center gap-1 text-sm text-red-700" title={st.message}>
                        <CircleAlert className="size-4" aria-hidden /> {st.message}
                      </span>
                    ) : (
                      <Badge tone="slate">Pronto</Badge>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!finished && (
              <Button onClick={send} loading={busy === "send"} disabled={!valid.length} icon={<FileUp className="size-5" aria-hidden />}>
                Enviar {valid.length} {valid.length === 1 ? "documento" : "documentos"}
              </Button>
            )}
            {finished && (
              <>
                <ButtonLink href="/rh/documentos?aba=pessoais">Ver documentos distribuídos</ButtonLink>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMatches(null);
                    setFiles([]);
                    setRows({});
                  }}
                >
                  Novo lote
                </Button>
              </>
            )}
          </div>
        </section>
      )}
      <p className="text-sm text-muted">
        Precisa enviar só para uma pessoa?{" "}
        <Link href="/rh/documentos/distribuir" className="text-brand-700 hover:underline">
          Use o envio individual
        </Link>
        .
      </p>
    </div>
  );
}
