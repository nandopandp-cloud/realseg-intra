"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, KeyRound, Mail, Save, UserPlus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { createEmployeeSchema, employeeSchema } from "@/lib/validation/rh";
import { EmployeePicker, type PickedEmployee } from "../employee-picker";

type Org = {
  departments: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; city?: string; state?: string }>;
  positions: Array<{ id: string; name: string; level?: string; familyName?: string }>;
};
export type EmployeeFormValue = {
  fullName: string;
  preferredName: string;
  registrationNumber: string;
  email: string;
  departmentId: string;
  unitId: string;
  jobPositionId: string;
  manager: PickedEmployee | null;
  admissionDate: string;
};
export const EMPTY_EMPLOYEE: EmployeeFormValue = { fullName: "", preferredName: "", registrationNumber: "", email: "", departmentId: "", unitId: "", jobPositionId: "", manager: null, admissionDate: "" };

const ROLE_INFO = [
  { key: "RH", label: "Recursos Humanos", text: "Acesso à gestão de pessoas, conteúdos e atendimento." },
  { key: "GESTOR", label: "Gestor", text: "Acompanha a própria equipe." },
  { key: "ADMIN", label: "Administrador", text: "Configurações, papéis e auditoria." },
] as const;

/** Senha temporária exibida uma única vez, com cópia e orientação de entrega. */
export function TemporaryPassword({ password, name }: { password: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
      <p className="font-semibold text-ink">Senha temporária de {name.split(" ")[0]}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-surface px-3 py-2 font-mono text-lg tracking-wider text-ink ring-1 ring-amber-200">{password}</code>
        <Button
          variant="outline"
          size="sm"
          icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          onClick={async () => {
            await navigator.clipboard?.writeText(password).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <p className="mt-2 text-sm text-amber-900">Ela aparece só agora. Entregue pessoalmente; no primeiro acesso o colaborador cria a própria senha.</p>
    </div>
  );
}

export function EmployeeForm({ id, initial, org, canManageRoles }: { id?: string; initial: EmployeeFormValue; org: Org; canManageRoles?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [access, setAccess] = useState<"temp" | "invite">("temp");
  const [roles, setRoles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; temporaryPassword: string | null } | null>(null);
  const set = <K extends keyof EmployeeFormValue>(k: K, val: EmployeeFormValue[K]) => setV((x) => ({ ...x, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = { ...v, preferredName: v.preferredName || null, managerEmployeeId: v.manager?.id ?? null, ...(id ? {} : { access, roles }) };
    const parsed = (id ? employeeSchema : createEmployeeSchema).safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      setFormError("Revise os campos destacados.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (id) {
        await api(`/rh/employees/${id}`, { method: "PUT", json: parsed.data });
        toast("success", "Dados atualizados.");
        router.refresh();
      } else {
        const r = await api<{ id: string; temporaryPassword: string | null }>("/rh/employees", { json: parsed.data });
        setCreated(r);
        toast("success", access === "invite" ? "Colaborador cadastrado. Convite enviado por e-mail." : "Colaborador cadastrado.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k, m[0]])));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Card className="flex max-w-2xl flex-col gap-4 p-6">
        <p className="text-xl font-bold text-ink">{v.fullName} foi cadastrado(a)</p>
        {created.temporaryPassword ? (
          <TemporaryPassword password={created.temporaryPassword} name={v.fullName} />
        ) : (
          <Alert kind="success">Enviamos para {v.email} um link para definir a senha (válido por 72 horas).</Alert>
        )}
        <p className="text-sm text-muted">Login: e-mail ou matrícula {v.registrationNumber}.</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/rh/colaboradores/${created.id}`}>Ver colaborador</ButtonLink>
          <Button
            variant="outline"
            onClick={() => {
              setCreated(null);
              setV(EMPTY_EMPLOYEE);
            }}
          >
            Cadastrar outro
          </Button>
        </div>
      </Card>
    );
  }

  const fld = (name: keyof EmployeeFormValue, label: string, opts: { hint?: string; type?: string; required?: boolean; max?: number; placeholder?: string; inputMode?: "numeric" | "email" } = {}) => (
    <Field label={label} hint={opts.hint} error={errors[name]} required={opts.required}>
      {({ id: fid, describedBy, invalid }) => (
        <Input id={fid} type={opts.type ?? "text"} value={v[name] as string} onChange={(e) => set(name, e.target.value as never)} maxLength={opts.max} placeholder={opts.placeholder} inputMode={opts.inputMode} aria-describedby={describedBy} invalid={invalid} />
      )}
    </Field>
  );
  const sel = (name: "departmentId" | "unitId" | "jobPositionId", label: string, items: Array<{ id: string; name: string; hint?: string }>) => (
    <Field label={label} error={errors[name]} required>
      {({ id: fid, describedBy, invalid }) => (
        <Select id={fid} value={v[name]} onChange={(e) => set(name, e.target.value)} aria-describedby={describedBy} invalid={invalid}>
          <option value="">Escolha…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
              {i.hint ? ` — ${i.hint}` : ""}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
      {formError && <Alert kind="error">{formError}</Alert>}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold text-ink">Dados pessoais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fld("fullName", "Nome completo", { required: true, max: 120 })}
          {fld("preferredName", "Como prefere ser chamado(a)", { hint: "Opcional. Usado na saudação.", max: 60 })}
          {fld("registrationNumber", "Matrícula", { required: true, max: 12, inputMode: "numeric", hint: "Também serve para entrar na intranet." })}
          {fld("email", "E-mail", { required: true, type: "email", max: 160, inputMode: "email" })}
        </div>
      </Card>
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold text-ink">Vínculo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sel("jobPositionId", "Cargo", org.positions.map((p) => ({ id: p.id, name: p.name, hint: p.familyName ? `${p.familyName}${p.level ? ` · ${p.level}` : ""}` : undefined })))}
          {sel("departmentId", "Área", org.departments)}
          {sel("unitId", "Unidade", org.units.map((u) => ({ id: u.id, name: u.name, hint: u.city ? `${u.city}/${u.state}` : undefined })))}
          {fld("admissionDate", "Data de admissão", { required: true, type: "date" })}
        </div>
        <EmployeePicker label="Gestor imediato (opcional)" value={v.manager} onChange={(m) => set("manager", m)} error={errors.managerEmployeeId} />
      </Card>
      {!id && (
        <Card className="flex flex-col gap-4 p-5">
          <fieldset>
            <legend className="text-lg font-bold text-ink">Primeiro acesso</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { m: "temp" as const, icon: KeyRound, t: "Senha temporária", d: "Gerada agora e entregue em mãos. Ideal para quem não usa e-mail no dia a dia." },
                { m: "invite" as const, icon: Mail, t: "Convite por e-mail", d: "O colaborador recebe um link para criar a senha (válido por 72 h)." },
              ].map((o) => (
                <label key={o.m} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", access === o.m ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas")}>
                  <input type="radio" name="access" checked={access === o.m} onChange={() => setAccess(o.m)} className="mt-1 size-5 accent-[var(--color-brand-700)]" />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      <o.icon className="size-4" aria-hidden /> {o.t}
                    </span>
                    <span className="block text-sm text-muted">{o.d}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {canManageRoles && (
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Papéis adicionais</legend>
              <p className="text-sm text-muted">Todo colaborador já tem o papel Colaborador.</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {ROLE_INFO.map((r) => (
                  <label key={r.key} className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 hover:bg-canvas">
                    <input type="checkbox" checked={roles.includes(r.key)} onChange={(e) => setRoles((x) => (e.target.checked ? [...x, r.key] : x.filter((k) => k !== r.key)))} className="mt-0.5 size-5 accent-[var(--color-brand-700)]" />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{r.label}</span>
                      <span className="block text-xs text-muted">{r.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </Card>
      )}
      <div>
        <Button type="submit" size="lg" loading={busy} icon={id ? <Save className="size-5" aria-hidden /> : <UserPlus className="size-5" aria-hidden />}>
          {id ? "Salvar alterações" : "Cadastrar colaborador"}
        </Button>
      </div>
    </form>
  );
}
