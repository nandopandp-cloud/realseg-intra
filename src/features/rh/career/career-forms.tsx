"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Pencil, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { opportunitySchema, type AudienceValue } from "@/lib/validation/rh";
import { AudiencePicker, type AudienceOptions } from "../audience-picker";

type Opt = { id: string; name: string };
export type OpportunityValue = {
  title: string;
  areaLabel: string;
  description: string;
  requirements: string;
  jobPositionId: string;
  departmentId: string;
  unitId: string;
  isHighlighted: boolean;
  closesAt: string; // yyyy-mm-dd (fim do dia)
  eligibility: AudienceValue;
};
export const EMPTY_OPPORTUNITY: OpportunityValue = {
  title: "",
  areaLabel: "",
  description: "",
  requirements: "",
  jobPositionId: "",
  departmentId: "",
  unitId: "",
  isHighlighted: false,
  closesAt: "",
  eligibility: { all: true, department: [], unit: [], job_position: [], job_family: [] },
};

/** Oportunidade interna: dados, local, prazo de inscrição e quem pode se candidatar. */
export function OpportunityForm({ id, initial, org }: { id?: string; initial: OpportunityValue; org: AudienceOptions & { positions: Opt[] } }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof OpportunityValue>(k: K, val: OpportunityValue[K]) => setV((x) => ({ ...x, [k]: val }));

  async function save() {
    // Prazo informado como data: vale até o fim do dia (horário de Brasília).
    const closesAt = v.closesAt ? new Date(`${v.closesAt}T23:59:59-03:00`).toISOString() : null;
    const parsed = opportunitySchema.safeParse({ ...v, closesAt, jobPositionId: v.jobPositionId || null, departmentId: v.departmentId || null, unitId: v.unitId || null });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      setFormError("Revise os campos destacados.");
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    try {
      if (id) {
        await api(`/rh/opportunities/${id}`, { method: "PUT", json: parsed.data });
        toast("success", "Oportunidade atualizada.");
        router.refresh();
      } else {
        const r = await api<{ id: string }>("/rh/opportunities", { json: parsed.data });
        toast("success", "Oportunidade criada como rascunho.");
        router.push(`/rh/carreira/oportunidades/${r.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k.split(".")[0], m[0]])));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  const select = (name: "jobPositionId" | "departmentId" | "unitId", label: string, items: Opt[]) => (
    <Field label={label} hint="Opcional." error={errors[name]}>
      {({ id: fid, describedBy, invalid }) => (
        <Select id={fid} value={v[name]} onChange={(e) => set(name, e.target.value)} aria-describedby={describedBy} invalid={invalid}>
          <option value="">Não informar</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {formError && <Alert kind="error">{formError}</Alert>}
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Título da vaga" error={errors.title} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={120} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label="Área (rótulo)" hint="Ex.: Operações" error={errors.areaLabel} required>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} value={v.areaLabel} onChange={(e) => set("areaLabel", e.target.value)} maxLength={60} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
        </div>
        <Field label="Descrição" error={errors.description} required>
          {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} rows={5} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label="Requisitos" error={errors.requirements} required>
          {({ id: fid, describedBy, invalid }) => <Textarea id={fid} value={v.requirements} onChange={(e) => set("requirements", e.target.value)} maxLength={3000} rows={3} className="min-h-24" aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          {select("jobPositionId", "Cargo", org.positions)}
          {select("departmentId", "Área", org.departments)}
          {select("unitId", "Unidade (local)", org.units)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Inscrições até" hint="Opcional. Vazio = sem prazo." error={errors.closesAt}>
            {({ id: fid, describedBy, invalid }) => <Input id={fid} type="date" value={v.closesAt} onChange={(e) => set("closesAt", e.target.value)} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Switch checked={v.isHighlighted} onChange={(b) => set("isHighlighted", b)} label="Destaque" description="Aparece primeiro em Oportunidades." />
        </div>
      </Card>
      <Card className="p-5">
        <AudiencePicker value={v.eligibility} onChange={(a) => set("eligibility", a)} options={org} error={errors.eligibility} legend="Quem pode se candidatar" allLabel="Todos os colaboradores" />
      </Card>
      <div>
        <Button size="lg" onClick={save} loading={busy} icon={<Save className="size-5" aria-hidden />}>
          {id ? "Salvar alterações" : "Criar oportunidade"}
        </Button>
      </div>
    </div>
  );
}

/** Publicar (com aviso opcional aos elegíveis), encerrar ou voltar para rascunho. */
export function OpportunityStatusActions({ id, status, open }: { id: string; status: "draft" | "published" | "closed"; open: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"publish" | "close" | null>(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go(to: "draft" | "published" | "closed", ok: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/rh/opportunities/${id}/status`, { json: { status: to, notify } });
      toast("success", ok);
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <Button onClick={() => setDialog("publish")} icon={<Send className="size-5" aria-hidden />}>
            Publicar
          </Button>
        )}
        {status === "published" && open && (
          <Button variant="outline" onClick={() => setDialog("close")} icon={<Ban className="size-5" aria-hidden />}>
            Encerrar inscrições
          </Button>
        )}
        {(status === "closed" || (status === "published" && !open)) && (
          <Button variant="outline" loading={busy} onClick={() => go("draft", "Oportunidade voltou para rascunho.")} icon={<RotateCcw className="size-5" aria-hidden />}>
            Reabrir como rascunho
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
      <Dialog
        open={dialog === "publish"}
        onClose={() => setDialog(null)}
        title="Publicar oportunidade"
        description="Fica visível em Minha carreira › Oportunidades para quem pode se candidatar."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Voltar
            </Button>
            <Button onClick={() => go("published", "Oportunidade publicada.")} loading={busy}>
              Publicar
            </Button>
          </>
        }
      >
        <Switch checked={notify} onChange={setNotify} label="Avisar os elegíveis" description="Envia uma notificação na intranet." />
      </Dialog>
      <ConfirmDialog
        open={dialog === "close"}
        onClose={() => setDialog(null)}
        onConfirm={() => go("closed", "Inscrições encerradas.")}
        loading={busy}
        title="Encerrar inscrições?"
        description="Candidaturas em aberto serão encerradas e os candidatos, avisados."
        confirmLabel="Encerrar"
      />
    </div>
  );
}

/** Situação de uma candidatura (em análise / encerrada). */
export function ApplicationActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (status === "retirada" || status === "encerrada") return null;
  async function go(to: "em_analise" | "encerrada") {
    setBusy(true);
    try {
      await api(`/rh/applications/${id}/status`, { json: { status: to } });
      toast("success", to === "em_analise" ? "Candidatura em análise. O colaborador foi avisado." : "Candidatura encerrada. O colaborador foi avisado.");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex gap-1">
      {status === "enviada" && (
        <Button size="sm" variant="outline" loading={busy} onClick={() => go("em_analise")}>
          Analisar
        </Button>
      )}
      <Button size="sm" variant="ghost" loading={busy} onClick={() => go("encerrada")}>
        Encerrar
      </Button>
    </div>
  );
}

type Band = { id?: string; minCents: number; maxCents: number; effectiveFrom: string; effectiveUntil: string | null; visibleToEmployees: boolean };

/** Faixa salarial de um cargo (valores em reais). */
export function BandDialogButton({ positionId, positionTitle, band }: { positionId: string; positionTitle: string; band?: Band }) {
  const router = useRouter();
  const toast = useToast();
  const toReais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [min, setMin] = useState(band ? toReais(band.minCents) : "");
  const [max, setMax] = useState(band ? toReais(band.maxCents) : "");
  const [from, setFrom] = useState(band?.effectiveFrom ?? new Date().toISOString().slice(0, 10));
  const [until, setUntil] = useState(band?.effectiveUntil ?? "");
  const [visible, setVisible] = useState(band?.visibleToEmployees ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cents = (s: string) => Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100);

  async function save() {
    if (!min || !max || Number.isNaN(cents(min)) || Number.isNaN(cents(max))) return setError("Informe os valores mínimo e máximo.");
    setBusy(true);
    setError(null);
    try {
      const body = { jobPositionId: positionId, minCents: cents(min), maxCents: cents(max), effectiveFrom: from, effectiveUntil: until || null, visibleToEmployees: visible };
      await api(band?.id ? `/rh/salary-bands/${band.id}` : "/rh/salary-bands", { method: band?.id ? "PUT" : "POST", json: body });
      toast("success", "Faixa salva.");
      setOpen(false);
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
      await api(`/rh/salary-bands/${band!.id}`, { method: "DELETE" });
      toast("success", "Faixa excluída.");
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {band ? (
        <IconButton label={`Editar faixa de ${positionTitle}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button size="sm" variant="outline" icon={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
          Faixa
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Faixa salarial · ${positionTitle}`}
        description="Não há salário individual no sistema. O colaborador só vê faixas marcadas como visíveis e vigentes."
        footer={
          <>
            {band?.id && (
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mínimo (R$)" required>
              {({ id }) => <Input id={id} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="3.000,00" />}
            </Field>
            <Field label="Máximo (R$)" required>
              {({ id }) => <Input id={id} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="3.800,00" />}
            </Field>
            <Field label="Vigente a partir de" required>
              {({ id }) => <Input id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}
            </Field>
            <Field label="Vigente até" hint="Opcional.">
              {({ id, describedBy }) => <Input id={id} type="date" value={until} onChange={(e) => setUntil(e.target.value)} aria-describedby={describedBy} />}
            </Field>
          </div>
          <Switch checked={visible} onChange={setVisible} label="Visível para os colaboradores" description="Exibida no plano de cargos em Minha carreira." />
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={busy} tone="danger" title="Excluir faixa?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" />
    </>
  );
}

type Goal = { id: string; title: string; description: string | null; startsOn: string | null; dueDate: string | null; courseId: string | null; status: "pendente" | "em_andamento" | "concluida" };

/** Etapa do plano de desenvolvimento de um colaborador (aparece em Minha carreira › Próximas etapas). */
export function GoalDialogButton({ employeeId, goal, courses }: { employeeId: string; goal?: Goal; courses: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const empty: Omit<Goal, "id"> = { title: "", description: "", startsOn: "", dueDate: "", courseId: "", status: "pendente" };
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [v, setV] = useState<Omit<Goal, "id">>(goal ?? empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { ...v, description: v.description || null, startsOn: v.startsOn || null, dueDate: v.dueDate || null, courseId: v.courseId || null };
      await api(goal ? `/rh/employees/${employeeId}/goals/${goal.id}` : `/rh/employees/${employeeId}/goals`, { method: goal ? "PUT" : "POST", json: body });
      toast("success", goal ? "Etapa atualizada." : "Etapa adicionada. O colaborador foi avisado.");
      setOpen(false);
      if (!goal) setV(empty);
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
      await api(`/rh/employees/${employeeId}/goals/${goal!.id}`, { method: "DELETE" });
      toast("success", "Etapa excluída.");
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {goal ? (
        <IconButton label={`Editar etapa ${goal.title}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button icon={<Plus className="size-5" aria-hidden />} onClick={() => setOpen(true)}>
          Nova etapa
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={goal ? "Editar etapa" : "Nova etapa do plano"}
        footer={
          <>
            {goal && (
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
          <Field label="Etapa" required>
            {({ id }) => <Input id={id} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={140} placeholder="Ex.: Concluir curso NR 33" />}
          </Field>
          <Field label="Detalhes">
            {({ id }) => <Textarea id={id} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={1000} rows={2} className="min-h-20" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Começa em">
              {({ id }) => <Input id={id} type="date" value={v.startsOn ?? ""} onChange={(e) => setV({ ...v, startsOn: e.target.value })} />}
            </Field>
            <Field label="Prazo">
              {({ id }) => <Input id={id} type="date" value={v.dueDate ?? ""} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />}
            </Field>
          </div>
          <Field label="Curso relacionado" hint="Opcional. A etapa leva ao curso.">
            {({ id, describedBy }) => (
              <Select id={id} value={v.courseId ?? ""} onChange={(e) => setV({ ...v, courseId: e.target.value })} aria-describedby={describedBy}>
                <option value="">Nenhum</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Situação">
            {({ id }) => (
              <Select id={id} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as Goal["status"] })}>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </Select>
            )}
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={busy} tone="danger" title="Excluir etapa?" confirmLabel="Excluir" />
    </>
  );
}
