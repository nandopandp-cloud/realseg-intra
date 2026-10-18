import type { Metadata } from "next";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { Alert, Card } from "@/components/ui/primitives";
import { ChangePasswordForm, SessionsList } from "@/features/profile/security-forms";
import { requireCtx } from "@/server/auth/current";
import { mySessions } from "@/server/services/profile";

export const metadata: Metadata = { title: "Senha e segurança" };

export default async function SecurityPage({ searchParams }: PageProps<"/perfil/seguranca">) {
  const ctx = await requireCtx();
  const sessions = await mySessions(ctx);
  const mandatory = (await searchParams).obrigatorio === "1" || ctx.actor.mustChangePassword;
  return (
    <>
      <PageHero eyebrow="Conta" title="Senha e segurança" subtitle="Altere sua senha e veja onde sua conta está conectada." breadcrumb={[{ label: "Início", href: "/" }, { label: "Meu perfil", href: "/perfil" }, { label: "Senha e segurança" }]} />
      <PageBody>
        {mandatory && (
          <Alert kind="warning" title="Defina uma nova senha" className="mb-5">
            Por segurança, crie uma nova senha para continuar usando a intranet.
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-5" aria-labelledby="alterar">
            <h2 id="alterar" className="mb-4 text-lg font-bold text-ink">
              Alterar senha
            </h2>
            <ChangePasswordForm />
          </Card>
          <Card className="p-5" aria-labelledby="sessoes">
            <h2 id="sessoes" className="text-lg font-bold text-ink">
              Sessões ativas
            </h2>
            <p className="text-[0.9375rem] text-muted">Não reconhece algum aparelho? Encerre a sessão e altere sua senha.</p>
            <div className="mt-2">
              <SessionsList sessions={sessions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), lastSeenAt: s.lastSeenAt.toISOString() }))} />
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
