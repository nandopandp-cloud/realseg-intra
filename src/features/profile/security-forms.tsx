"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, fieldErrors } from "@/lib/api-client";
import { fmtDateTime } from "@/lib/format";
import { changePasswordSchema, PASSWORD_RULES } from "@/lib/validation/auth";

export function ChangePasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setOk(false);
    const form = e.currentTarget;
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    try {
      await api("/auth/password/change", { json: parsed.data });
      setOk(true);
      form.reset();
      router.refresh();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível alterar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {ok && <Alert kind="success" title="Senha alterada">As sessões abertas em outros aparelhos foram encerradas.</Alert>}
      {formError && !Object.keys(errors).length && <Alert kind="error">{formError}</Alert>}
      <Field label="Senha atual" error={errors.currentPassword} required>
        {({ id, describedBy, invalid, required }) => <Input id={id} name="currentPassword" type="password" autoComplete="current-password" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
      </Field>
      <Field label="Nova senha" hint={PASSWORD_RULES} error={errors.password} required>
        {({ id, describedBy, invalid, required }) => <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
      </Field>
      <Field label="Confirme a nova senha" error={errors.confirmPassword} required>
        {({ id, describedBy, invalid, required }) => <Input id={id} name="confirmPassword" type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
      </Field>
      <div>
        <Button type="submit" loading={busy}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}

type SessionRow = { id: string; current: boolean; createdAt: string; lastSeenAt: string; userAgent: string | null };

function deviceLabel(ua: string | null) {
  if (!ua) return { label: "Dispositivo desconhecido", mobile: false };
  const mobile = /Mobile|Android|iPhone/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { label: `${browser}${os ? ` em ${os}` : ""}`, mobile };
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  return (
    <ul className="divide-y divide-line">
      {sessions.map((s) => {
        const d = deviceLabel(s.userAgent);
        const Icon = d.mobile ? Smartphone : Monitor;
        return (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <Icon className="size-6 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {d.label} {s.current && <span className="text-sm font-medium text-brand-700">(este aparelho)</span>}
              </p>
              <p className="text-sm text-muted">Último uso: {fmtDateTime(s.lastSeenAt)}</p>
            </div>
            {!s.current && (
              <Button
                variant="outline"
                size="sm"
                loading={busyId === s.id}
                onClick={async () => {
                  setBusyId(s.id);
                  try {
                    await api(`/me/sessions/${s.id}`, { method: "DELETE" });
                    toast("success", "Sessão encerrada.");
                    router.refresh();
                  } catch (err) {
                    toast("error", err instanceof ApiError ? err.message : "Não foi possível encerrar.");
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Encerrar
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
