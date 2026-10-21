"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { TONES } from "@/lib/validation/rh";
import { EmployeePicker, type PickedEmployee } from "../employee-picker";

/** Atribuição do curso: todo o público do curso ou pessoas escolhidas, com prazo opcional. */
export function AssignCourse({ courseId, audienceSize, defaultDueDays, published }: { courseId: string; audienceSize: number; defaultDueDays: number | null; published: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"audience" | "employees">("audience");
  const [people, setPeople] = useState<PickedEmployee[]>([]);
  const [due, setDue] = useState<number | "">(defaultDueDays ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ created: number; updated: number }>(`/rh/courses/${courseId}/assign`, { json: { target, employeeIds: people.map((p) => p.id), dueDays: due === "" ? null : due } });
      toast("success", `${r.created} ${r.created === 1 ? "nova matrícula" : "novas matrículas"}${r.updated ? ` · prazo atualizado para ${r.updated}` : ""}.`);
      setOpen(false);
      setPeople([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atribuir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!published} icon={<UserPlus className="size-5" aria-hidden />} title={published ? undefined : "Publique o curso para atribuir"}>
        Atribuir curso
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Atribuir curso"
        description="Quem recebe é matriculado e avisado na intranet. Quem já está matriculado não é duplicado."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} loading={busy}>
              Atribuir
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert kind="error">{error}</Alert>}
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Para quem</legend>
            {[
              { t: "audience" as const, title: `Todo o público do curso (${audienceSize})`, text: "Ideal para cursos obrigatórios." },
              { t: "employees" as const, title: "Pessoas específicas", text: "Escolha colaboradores pelo nome ou matrícula." },
            ].map((o) => (
              <label key={o.t} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", target === o.t ? "border-brand-600 bg-brand-50" : "border-line")}>
                <input type="radio" name="assign-target" checked={target === o.t} onChange={() => setTarget(o.t)} className="mt-1 size-5 accent-[var(--color-brand-700)]" />
                <span>
                  <span className="block font-semibold text-ink">{o.title}</span>
                  <span className="block text-sm text-muted">{o.text}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {target === "employees" && (
            <div>
              <EmployeePicker label="Adicionar colaborador" value={null} onChange={(e) => e && setPeople((p) => (p.some((x) => x.id === e.id) ? p : [...p, e]))} />
              {people.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {people.map((p) => (
                    <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-800">
                      {p.name}
                      <button type="button" onClick={() => setPeople((x) => x.filter((y) => y.id !== p.id))} aria-label={`Remover ${p.name}`} className="rounded-full p-0.5 hover:bg-brand-100">
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Field label="Prazo para concluir (dias)" hint="Opcional. Vazio = sem prazo." className="sm:max-w-xs">
            {({ id }) => <Input id={id} type="number" min={1} max={365} value={due} onChange={(e) => setDue(e.target.value ? Number(e.target.value) : "")} />}
          </Field>
        </div>
      </Dialog>
    </>
  );
}

type PathValue = { id?: string; title: string; description: string; color: string; icon: string; jobFamilyId: string; courseIds: string[] };

/** Trilha de aprendizagem: cursos em ordem, cor/ícone e família profissional (usada em "Minha carreira"). */
export function PathDialogButton({
  initial,
  courses,
  families,
  icons,
}: {
  initial?: PathValue;
  courses: Array<{ id: string; title: string; status: string }>;
  families: Array<{ id: string; name: string }>;
  icons: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const empty: PathValue = { title: "", description: "", color: "teal", icon: "graduation-cap", jobFamilyId: "", courseIds: [] };
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [v, setV] = useState<PathValue>(initial ?? empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = courses.filter((c) => !v.courseIds.includes(c.id));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { title: v.title, description: v.description, color: v.color, icon: v.icon, jobFamilyId: v.jobFamilyId || null, courseIds: v.courseIds };
      await api(initial?.id ? `/rh/learning-paths/${initial.id}` : "/rh/learning-paths", { method: initial?.id ? "PUT" : "POST", json: body });
      toast("success", "Trilha salva.");
      setOpen(false);
      if (!initial) setV(empty);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/rh/learning-paths/${initial!.id}`, { method: "DELETE" });
      toast("success", "Trilha excluída.");
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const ids = [...v.courseIds];
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    setV({ ...v, courseIds: ids });
  };

  return (
    <>
      {initial ? (
        <IconButton label={`Editar trilha ${initial.title}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button onClick={() => setOpen(true)} icon={<Plus className="size-5" aria-hidden />}>
          Nova trilha
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={initial ? `Editar trilha: ${initial.title}` : "Nova trilha"}
        className="max-w-2xl"
        footer={
          <>
            {initial && (
              <Button variant="ghost" className="mr-auto text-red-700" onClick={() => setConfirm(true)} icon={<Trash2 className="size-4" aria-hidden />}>
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
          <Field label="Nome" required>
            {({ id }) => <Input id={id} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={100} />}
          </Field>
          <Field label="Descrição">
            {({ id }) => <Textarea id={id} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={500} rows={2} className="min-h-20" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cor">
              {({ id }) => (
                <Select id={id} value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })}>
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Ícone">
              {({ id }) => (
                <Select id={id} value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })}>
                  {icons.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Família profissional" hint="Opcional. Sugerida em Minha carreira.">
              {({ id, describedBy }) => (
                <Select id={id} value={v.jobFamilyId} onChange={(e) => setV({ ...v, jobFamilyId: e.target.value })} aria-describedby={describedBy}>
                  <option value="">Nenhuma</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Cursos da trilha (em ordem)</legend>
            <ol className="mt-2 flex flex-col gap-1">
              {v.courseIds.map((cid, i) => (
                <li key={cid} className="flex items-center gap-1 rounded-lg border border-line px-3 py-1">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {i + 1}. {courses.find((c) => c.id === cid)?.title}
                  </span>
                  <IconButton label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label="Descer" disabled={i === v.courseIds.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label="Remover da trilha" onClick={() => setV({ ...v, courseIds: v.courseIds.filter((x) => x !== cid) })}>
                    <X className="size-4" aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ol>
            {available.length > 0 && (
              <Select aria-label="Adicionar curso à trilha" className="mt-2" value="" onChange={(e) => e.target.value && setV({ ...v, courseIds: [...v.courseIds, e.target.value] })}>
                <option value="">+ Adicionar curso…</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.status !== "published" ? " (não publicado)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </fieldset>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={busy} tone="danger" title="Excluir trilha?" description="Os cursos continuam no catálogo; só a trilha é excluída." confirmLabel="Excluir" />
    </>
  );
}
