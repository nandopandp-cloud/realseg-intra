"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, FileUp, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, fieldErrors } from "@/lib/api-client";

/** Nova norma/manual institucional (visível a todos os colaboradores com acesso). */
export function InstitutionalForm({ categories }: { categories: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [requiresAck, setRequiresAck] = useState(true);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!files[0]) return setErrors({ file: "Selecione o arquivo." });
    fd.set("requiresAck", String(requiresAck));
    fd.set("notify", String(notify));
    fd.set("file", files[0]);
    setBusy(true);
    setFormError(null);
    try {
      const r = await api<{ id: string }>("/rh/documents/institutional", { formData: fd });
      toast("success", "Documento publicado para todos os colaboradores.");
      router.push(`/rh/documentos/${r.id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {formError && <Alert kind="error">{formError}</Alert>}
      <Field label="Tipo" error={errors.categorySlug} required>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name="categorySlug" aria-describedby={describedBy} invalid={invalid}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Título" error={errors.title} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="title" maxLength={140} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label="Descrição" hint="Opcional. Resumo exibido na lista de normas." error={errors.description}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="description" maxLength={1000} rows={3} className="min-h-24" aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vigente a partir de" hint="Opcional." error={errors.effectiveFrom}>
          {({ id, describedBy, invalid }) => <Input id={id} name="effectiveFrom" type="date" aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label="Vigente até" hint="Opcional. Depois desta data, sai da lista do colaborador." error={errors.effectiveUntil}>
          {({ id, describedBy, invalid }) => <Input id={id} name="effectiveUntil" type="date" aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </div>
      <div className="divide-y divide-line">
        <Switch checked={requiresAck} onChange={setRequiresAck} label="Exige confirmação de ciência" description="Cada colaborador confirma que leu a versão vigente." />
        <Switch checked={notify} onChange={setNotify} label="Avisar todos os colaboradores" description="Envia uma notificação na intranet." />
      </div>
      <FileUpload label="Arquivo" files={files} onChange={setFiles} error={errors.file} required allowCamera={false} />
      <div>
        <Button type="submit" size="lg" loading={busy} icon={<FileUp className="size-5" aria-hidden />}>
          Publicar documento
        </Button>
      </div>
    </form>
  );
}

type Meta = { title: string; description: string | null; referencePeriod: string | null; requiresAck: boolean; effectiveFrom: string | null; effectiveUntil: string | null };

/** Gestão de um documento: dados, nova versão, arquivar/restaurar e remover (enviado por engano). */
export function DocumentManage({ id, scope, status, meta }: { id: string; scope: "personal" | "institutional"; status: "active" | "archived"; meta: Meta }) {
  const router = useRouter();
  const toast = useToast();
  const [m, setM] = useState(meta);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"version" | "remove" | "archive" | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const archived = status === "archived";

  async function run(key: string, fn: () => Promise<unknown>, ok: string, after?: () => void) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      toast("success", ok);
      setDialog(null);
      after?.();
      router.refresh();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  const saveMeta = () => run("meta", () => api(`/rh/documents/${id}`, { method: "PUT", json: { ...m, description: m.description || null } }), "Dados atualizados.");
  const newVersion = () => {
    if (!files[0]) return setError("Selecione o arquivo da nova versão.");
    const fd = new FormData();
    fd.set("file", files[0]);
    if (note.trim()) fd.set("changeNote", note.trim());
    fd.set("notify", String(notify));
    run("version", () => api(`/rh/documents/${id}/versions`, { formData: fd }), "Nova versão publicada.", () => {
      setFiles([]);
      setNote("");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {error && !dialog && <Alert kind="error">{error}</Alert>}
      <fieldset disabled={archived} className="flex flex-col gap-4">
        <legend className="sr-only">Dados do documento</legend>
        <Field label="Título" error={errors.title} required>
          {({ id: fid, describedBy, invalid }) => <Input id={fid} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} maxLength={140} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label="Descrição" error={errors.description}>
          {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={m.description ?? ""} onChange={(e) => setM({ ...m, description: e.target.value })} maxLength={1000} rows={2} className="min-h-20" aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        {scope === "personal" ? (
          <Field label="Competência" error={errors.referencePeriod}>
            {({ id: fid }) => <Input id={fid} type="month" value={m.referencePeriod ?? ""} onChange={(e) => setM({ ...m, referencePeriod: e.target.value || null })} />}
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vigente a partir de" error={errors.effectiveFrom}>
              {({ id: fid }) => <Input id={fid} type="date" value={m.effectiveFrom ?? ""} onChange={(e) => setM({ ...m, effectiveFrom: e.target.value || null })} />}
            </Field>
            <Field label="Vigente até" error={errors.effectiveUntil}>
              {({ id: fid }) => <Input id={fid} type="date" value={m.effectiveUntil ?? ""} onChange={(e) => setM({ ...m, effectiveUntil: e.target.value || null })} />}
            </Field>
          </div>
        )}
        <Switch checked={m.requiresAck} onChange={(b) => setM({ ...m, requiresAck: b })} label="Exige confirmação de ciência" disabled={archived} />
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {!archived && (
          <>
            <Button onClick={saveMeta} loading={busy === "meta"} icon={<Save className="size-4" aria-hidden />} size="sm">
              Salvar dados
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog("version")} icon={<FileUp className="size-4" aria-hidden />}>
              Nova versão do arquivo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDialog("archive")} icon={<Archive className="size-4" aria-hidden />}>
              Arquivar
            </Button>
          </>
        )}
        {archived && (
          <Button variant="outline" size="sm" loading={busy === "restore"} onClick={() => run("restore", () => api(`/rh/documents/${id}/restore`, { method: "POST" }), "Documento restaurado.")} icon={<RotateCcw className="size-4" aria-hidden />}>
            Restaurar
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-red-700" onClick={() => setDialog("remove")} icon={<Trash2 className="size-4" aria-hidden />}>
          Remover (enviado por engano)
        </Button>
      </div>

      <Dialog
        open={dialog === "version"}
        onClose={() => setDialog(null)}
        title="Nova versão do arquivo"
        description="A nova versão substitui a atual. Se o documento exige ciência, ela passa a valer para a nova versão."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Voltar
            </Button>
            <Button onClick={newVersion} loading={busy === "version"}>
              Publicar nova versão
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert kind="error">{error}</Alert>}
          <FileUpload label="Arquivo" files={files} onChange={setFiles} required allowCamera={false} />
          <Field label="O que mudou?" hint="Opcional. Aparece no histórico de versões.">
            {({ id: fid }) => <Input id={fid} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />}
          </Field>
          <Switch checked={notify} onChange={setNotify} label={scope === "personal" ? "Avisar o colaborador" : "Avisar todos os colaboradores"} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        onConfirm={() => run("archive", () => api(`/rh/documents/${id}/archive`, { method: "POST" }), "Documento arquivado.")}
        loading={busy === "archive"}
        title="Arquivar documento?"
        description={scope === "personal" ? "O colaborador deixa de ver o documento. O histórico de ciência é mantido." : "A norma sai da lista dos colaboradores. O histórico de ciência é mantido."}
        confirmLabel="Arquivar"
      />
      <Dialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title="Remover documento"
        description="Use apenas para documentos enviados por engano (ex.: para a pessoa errada). O registro fica guardado na auditoria."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Voltar
            </Button>
            <Button variant="danger" loading={busy === "remove"} onClick={() => run("remove", () => api(`/rh/documents/${id}`, { method: "DELETE", json: { reason } }), "Documento removido.", () => router.push("/rh/documentos?aba=pessoais"))}>
              Remover
            </Button>
          </>
        }
      >
        <Field label="Motivo" required error={errors.reason ?? (dialog === "remove" ? (error ?? undefined) : undefined)}>
          {({ id: fid, describedBy, invalid }) => <Input id={fid} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ex.: enviado para o colaborador errado" aria-describedby={describedBy} invalid={invalid} />}
        </Field>
      </Dialog>
    </div>
  );
}
