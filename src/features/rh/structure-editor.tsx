"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

export type FieldDef =
  | { name: string; label: string; kind: "text" | "number"; required?: boolean; hint?: string; max?: number }
  | { name: string; label: string; kind: "textarea"; hint?: string; max?: number }
  | { name: string; label: string; kind: "select"; required?: boolean; options: Array<{ value: string; label: string }>; emptyLabel?: string }
  | { name: string; label: string; kind: "switch"; hint?: string };

type Values = Record<string, string | number | boolean | null>;

/**
 * Criação/edição de um item de cadastro simples (área, unidade, família, cargo) em diálogo.
 * `endpoint` é a coleção da API (ex.: /rh/org/units); a edição usa `${endpoint}/${id}`.
 */
export function EntityDialogButton({
  endpoint,
  title,
  fields,
  initial,
  id,
  label,
  variant = "create",
  deletable,
}: {
  endpoint: string;
  title: string;
  fields: FieldDef[];
  initial: Values;
  id?: string;
  label: string;
  variant?: "create" | "edit";
  deletable?: { confirm: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setErrors({});
    const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val === "" ? null : val]));
    try {
      await api(id ? `${endpoint}/${id}` : endpoint, { method: id ? "PUT" : "POST", json: body });
      toast("success", id ? "Alterações salvas." : "Cadastro criado.");
      setOpen(false);
      if (!id) setV(initial);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k, m[0]])));
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`${endpoint}/${id}`, { method: "DELETE" });
      toast("success", "Excluído.");
      setConfirmDelete(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir.");
      setConfirmDelete(false);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {variant === "create" ? (
        <Button onClick={() => setOpen(true)} icon={<Plus className="size-5" aria-hidden />}>
          {label}
        </Button>
      ) : (
        <IconButton label={label} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            {deletable && id && (
              <Button variant="ghost" className="mr-auto text-red-700" onClick={() => setConfirmDelete(true)} icon={<Trash2 className="size-4" aria-hidden />}>
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert kind="error">{error}</Alert>}
          {fields.map((f) =>
            f.kind === "switch" ? (
              <Switch key={f.name} checked={!!v[f.name]} onChange={(b) => setV({ ...v, [f.name]: b })} label={f.label} description={f.hint} />
            ) : (
              <Field key={f.name} label={f.label} hint={"hint" in f ? f.hint : undefined} error={errors[f.name]} required={"required" in f ? f.required : undefined}>
                {({ id: fid, describedBy, invalid }) =>
                  f.kind === "select" ? (
                    <Select id={fid} value={String(v[f.name] ?? "")} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} aria-describedby={describedBy} invalid={invalid}>
                      <option value="">{f.emptyLabel ?? "Escolha…"}</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.kind === "textarea" ? (
                    <Textarea id={fid} value={String(v[f.name] ?? "")} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} maxLength={f.max} rows={3} className="min-h-24" aria-describedby={describedBy} invalid={invalid} />
                  ) : (
                    <Input
                      id={fid}
                      type={f.kind === "number" ? "number" : "text"}
                      value={String(v[f.name] ?? "")}
                      onChange={(e) => setV({ ...v, [f.name]: f.kind === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })}
                      maxLength={f.max}
                      aria-describedby={describedBy}
                      invalid={invalid}
                    />
                  )
                }
              </Field>
            ),
          )}
        </div>
      </Dialog>
      {deletable && <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={remove} loading={busy} tone="danger" title="Excluir?" description={deletable.confirm} confirmLabel="Excluir" />}
    </>
  );
}
