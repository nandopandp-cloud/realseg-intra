"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

const PRIORITY_LABEL: Record<string, string> = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };

/** "600 min" → "1 dia útil" (dia útil = minutos do expediente). */
export function fmtBusiness(min: number, perDay: number) {
  if (min >= perDay && min % perDay === 0) return `${min / perDay} ${min / perDay === 1 ? "dia útil" : "dias úteis"}`;
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""} úteis`;
  return `${min} min úteis`;
}

/** Célula da matriz de SLA: edição de 1ª resposta, resolução e alerta. Salvar cria nova versão. */
export function SlaCellButton({
  categoryId,
  categoryName,
  priority,
  perDay,
  policy,
}: {
  categoryId: string;
  categoryName: string;
  priority: string;
  perDay: number;
  policy: { firstResponseMinutes: number; resolutionMinutes: number; warnAtPercent: number } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const toHours = (m: number) => String(Math.round((m / 60) * 10) / 10).replace(".", ",");
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(policy ? toHours(policy.firstResponseMinutes) : "4");
  const [resolution, setResolution] = useState(policy ? toHours(policy.resolutionMinutes) : String(perDay / 60));
  const [warn, setWarn] = useState(policy?.warnAtPercent ?? 80);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minutes = (h: string) => Math.round(Number(h.replace(",", ".")) * 60);

  async function save() {
    const f = minutes(first);
    const r = minutes(resolution);
    if (!f || !r || Number.isNaN(f) || Number.isNaN(r)) return setError("Informe os prazos em horas úteis.");
    setBusy(true);
    setError(null);
    try {
      await api("/rh/settings/sla", { json: { categoryId, priority, firstResponseMinutes: f, resolutionMinutes: r, warnAtPercent: warn } });
      toast("success", "Prazo atualizado. Vale para novas solicitações.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-canvas" aria-label={`Editar prazo de ${categoryName}, prioridade ${PRIORITY_LABEL[priority]}`}>
        {policy ? (
          <>
            <span className="block text-sm font-semibold text-ink">{fmtBusiness(policy.resolutionMinutes, perDay)}</span>
            <span className="block text-xs text-muted">1ª resposta: {fmtBusiness(policy.firstResponseMinutes, perDay)}</span>
          </>
        ) : (
          <span className="text-sm text-muted">Sem prazo · definir</span>
        )}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${categoryName} · prioridade ${PRIORITY_LABEL[priority]}`}
        description={`Prazos em horas úteis (expediente de ${perDay / 60}h por dia). Solicitações já abertas mantêm o prazo da abertura.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={busy}>
              Salvar prazo
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert kind="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="1ª resposta (horas úteis)" required>
              {({ id }) => <Input id={id} inputMode="decimal" value={first} onChange={(e) => setFirst(e.target.value)} />}
            </Field>
            <Field label="Resolução (horas úteis)" hint={`${perDay / 60}h = 1 dia útil`} required>
              {({ id, describedBy }) => <Input id={id} inputMode="decimal" value={resolution} onChange={(e) => setResolution(e.target.value)} aria-describedby={describedBy} />}
            </Field>
          </div>
          <Field label="Alertar o responsável ao consumir (%) do prazo">
            {({ id }) => <Input id={id} type="number" min={10} max={99} value={warn} onChange={(e) => setWarn(Number(e.target.value))} className="sm:max-w-32" />}
          </Field>
        </div>
      </Dialog>
    </>
  );
}

const DAYS = [
  { k: "1", label: "Segunda" },
  { k: "2", label: "Terça" },
  { k: "3", label: "Quarta" },
  { k: "4", label: "Quinta" },
  { k: "5", label: "Sexta" },
  { k: "6", label: "Sábado" },
  { k: "0", label: "Domingo" },
] as const;

/** Expediente de atendimento por dia da semana (usado no cálculo dos prazos e no "Horário de atendimento"). */
export function WorkingHoursEditor({ initial }: { initial: Partial<Record<string, Array<[string, string]>>> }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(() => Object.fromEntries(DAYS.map((d) => [d.k, initial[d.k]?.[0] ?? null])) as Record<string, [string, string] | null>);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const workingHours = Object.fromEntries(Object.entries(v).map(([k, slot]) => [k, slot ? [slot] : []]));
      await api("/rh/settings/calendar", { method: "PUT", json: { workingHours } });
      toast("success", "Expediente atualizado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert kind="error">{error}</Alert>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {DAYS.map((d) => {
          const slot = v[d.k];
          return (
            <li key={d.k} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <label className="flex w-36 items-center gap-2 text-[0.9375rem] font-medium text-ink">
                <input type="checkbox" checked={!!slot} onChange={(e) => setV({ ...v, [d.k]: e.target.checked ? ["08:00", "18:00"] : null })} className="size-5 accent-[var(--color-brand-700)]" />
                {d.label}
              </label>
              {slot ? (
                <span className="flex items-center gap-2">
                  <Input type="time" aria-label={`${d.label}: início`} value={slot[0]} onChange={(e) => setV({ ...v, [d.k]: [e.target.value, slot[1]] })} className="w-32" />
                  <span className="text-muted">às</span>
                  <Input type="time" aria-label={`${d.label}: fim`} value={slot[1]} onChange={(e) => setV({ ...v, [d.k]: [slot[0], e.target.value] })} className="w-32" />
                </span>
              ) : (
                <span className="text-sm text-muted">Sem atendimento</span>
              )}
            </li>
          );
        })}
      </ul>
      <div>
        <Button onClick={save} loading={busy} icon={<Save className="size-5" aria-hidden />}>
          Salvar expediente
        </Button>
      </div>
    </div>
  );
}

/** Feriados (não contam no prazo). Nacionais já vêm cadastrados; inclua estaduais e municipais. */
export function HolidayAdder() {
  const router = useRouter();
  const toast = useToast();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api("/rh/settings/holidays", { json: { date, name } });
      toast("success", "Feriado incluído.");
      setDate("");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível incluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Data">
          {({ id }) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />}
        </Field>
        <Field label="Nome" className="min-w-56 flex-1">
          {({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Aniversário da cidade" />}
        </Field>
        <Button onClick={add} loading={busy} icon={<Plus className="size-5" aria-hidden />}>
          Incluir
        </Button>
      </div>
      {error && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function HolidayRemove({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <IconButton label={`Remover feriado ${label}`} onClick={() => setConfirm(true)}>
        <Trash2 className="size-4 text-red-700" aria-hidden />
      </IconButton>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/rh/settings/holidays/${id}`, { method: "DELETE" });
            toast("success", "Feriado removido.");
            router.refresh();
          } catch (err) {
            toast("error", err instanceof ApiError ? err.message : "Não foi possível remover.");
          } finally {
            setBusy(false);
            setConfirm(false);
          }
        }}
        loading={busy}
        tone="danger"
        title="Remover feriado?"
        description={label}
        confirmLabel="Remover"
      />
    </>
  );
}
