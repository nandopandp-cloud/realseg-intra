"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { api, ApiError, fieldErrors } from "@/lib/api-client";
import { loginSchema } from "@/lib/validation/auth";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await api<{ mustChangePassword: boolean }>("/auth/login", { json: parsed.data });
      router.replace(res.mustChangePassword ? "/perfil/seguranca?obrigatorio=1" : next);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setErrors(fieldErrors(err));
      setFormError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
      <div ref={errorRef} tabIndex={-1} className="outline-none">
        {formError && <Alert kind="error">{formError}</Alert>}
      </div>
      <Field label="E-mail ou matrícula" error={errors.identifier} required>
        {({ id, describedBy, invalid, required }) => (
          <Input id={id} name="identifier" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} autoFocus />
        )}
      </Field>
      <Field label="Senha" error={errors.password} required>
        {({ id, describedBy, invalid, required }) => (
          <div className="relative">
            <Input id={id} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-describedby={describedBy} invalid={invalid} aria-required={required || undefined} className="pr-14" />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
        )}
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-brand-600 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" loading={loading} icon={<LogIn className="size-5" aria-hidden />}>
        Entrar
      </Button>
    </form>
  );
}
