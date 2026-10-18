import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/primitives";
import { LoginForm } from "@/features/auth/login-form";
import { getSessionState, safeNext } from "@/server/auth/current";

export const metadata: Metadata = { title: "Entrar" };

const MESSAGES: Record<string, { kind: "info" | "success"; title: string; text: string }> = {
  "sessao-expirada": { kind: "info", title: "Sua sessão expirou", text: "Por segurança, entre novamente para continuar de onde parou." },
  "senha-redefinida": { kind: "success", title: "Senha redefinida", text: "Entre com a sua nova senha." },
  saiu: { kind: "success", title: "Você saiu da intranet", text: "Até logo!" },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const state = await getSessionState();
  if (state.status === "valid") redirect(next);
  const msg = typeof sp.motivo === "string" ? MESSAGES[sp.motivo] : undefined;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-ink">Entrar na intranet</h1>
      <p className="mt-2 text-base text-muted">Use seu e-mail corporativo ou sua matrícula.</p>
      {msg && (
        <Alert kind={msg.kind} title={msg.title} className="mt-6">
          {msg.text}
        </Alert>
      )}
      <LoginForm next={next} />
    </div>
  );
}
