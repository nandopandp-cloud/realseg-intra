import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Voltar para o login
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-ink">Recuperar senha</h1>
      <p className="mt-2 text-base text-muted">Informe seu e-mail corporativo. Enviaremos um link para você criar uma nova senha.</p>
      <ForgotPasswordForm />
    </div>
  );
}
