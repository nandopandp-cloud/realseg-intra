"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { api, ApiError, fieldErrors } from "@/lib/api-client";
import { forgotPasswordSchema, PASSWORD_RULES, resetPasswordSchema } from "@/lib/validation/auth";

function issuesToMap(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(issuesToMap(parsed.error.issues));
    setErrors({});
    setLoading(true);
    try {
      await api("/auth/password/forgot", { json: parsed.data });
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível enviar agora.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Alert kind="success" title="Verifique seu e-mail" className="mt-8">
        Se o e-mail estiver cadastrado, você receberá em alguns minutos um link válido por 30 minutos. Confira também a caixa de spam.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
      {formError && <Alert kind="error">{formError}</Alert>}
      <Field label="E-mail corporativo" error={errors.email} required>
        {({ id, describedBy, invalid, required }) => <Input id={id} name="email" type="email" autoComplete="email" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} autoFocus />}
      </Field>
      <Button type="submit" size="lg" loading={loading} icon={<Mail className="size-5" aria-hidden />}>
        Enviar link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), token };
    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) return setErrors(issuesToMap(parsed.error.issues));
    setErrors({});
    setLoading(true);
    try {
      await api("/auth/password/reset", { json: parsed.data });
      router.replace("/login?motivo=senha-redefinida");
    } catch (err) {
      setLoading(false);
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível redefinir agora.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
      {formError && (
        <Alert kind="error">
          {formError}{" "}
          <Link href="/recuperar-senha" className="font-semibold underline">
            Solicitar novo link
          </Link>
        </Alert>
      )}
      <Field label="Nova senha" hint={PASSWORD_RULES} error={errors.password} required>
        {({ id, describedBy, invalid, required }) => <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
      </Field>
      <Field label="Confirme a nova senha" error={errors.confirmPassword} required>
        {({ id, describedBy, invalid, required }) => <Input id={id} name="confirmPassword" type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} />}
      </Field>
      <Button type="submit" size="lg" loading={loading}>
        Salvar nova senha
      </Button>
    </form>
  );
}
