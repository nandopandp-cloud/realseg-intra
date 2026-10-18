import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/primitives";
import { ResetPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Criar nova senha" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length >= 20 && token.length <= 100;
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-ink">Criar nova senha</h1>
      {valid ? (
        <>
          <p className="mt-2 text-base text-muted">Escolha uma senha que você não use em outros serviços.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <Alert kind="error" title="Link inválido" className="mt-6">
          Este link de redefinição está incompleto ou expirou.{" "}
          <Link href="/recuperar-senha" className="font-semibold text-brand-700 underline">
            Solicite um novo link
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}
