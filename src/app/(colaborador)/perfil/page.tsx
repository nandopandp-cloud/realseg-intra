import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ChevronRight, KeyRound, ShieldCheck } from "lucide-react";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { Avatar, Card } from "@/components/ui/primitives";
import { NotificationPreferences } from "@/features/profile/notification-actions";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { getNotificationPreferences } from "@/server/services/notifications";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const ctx = await requireCtx();
  const [p, prefs] = await Promise.all([getProfile(ctx), getNotificationPreferences(ctx)]);
  const rows: Array<[string, string | null | undefined]> = [
    ["Nome", p.fullName],
    ["Matrícula", p.registrationNumber],
    ["E-mail corporativo", p.email],
    ["Cargo", p.position ? `${p.position} ${p.positionLevel && p.positionLevel.length <= 3 ? p.positionLevel : ""}` : null],
    ["Família profissional", p.family],
    ["Setor", p.department],
    ["Unidade", p.unit ? `${p.unit} — ${p.unitCity}/${p.unitState}` : null],
    ["Admissão", p.admissionDate ? fmtDate(p.admissionDate + "T12:00:00Z") : null],
  ];
  return (
    <>
      <PageHero eyebrow="Conta" title="Meu perfil" subtitle="Seus dados cadastrais e preferências." breadcrumb={[{ label: "Início", href: "/" }, { label: "Meu perfil" }]} />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-5" aria-labelledby="dados">
            <div className="flex items-center gap-4">
              <Avatar name={p.fullName ?? p.email} size="lg" />
              <div>
                <h2 id="dados" className="text-xl font-bold text-ink">
                  {p.fullName}
                </h2>
                <p className="text-muted">Colaborador</p>
              </div>
            </div>
            <dl className="mt-5 divide-y divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="text-[0.9375rem] text-muted">{k}</dt>
                  <dd className="text-[0.9375rem] font-semibold break-words text-ink sm:text-right">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted">
              Algum dado incorreto?{" "}
              <Link href="/fale-com-rh" className="font-semibold text-brand-600 underline">
                Solicite a correção ao RH
              </Link>
              .
            </p>
          </Card>
          <div className="flex flex-col gap-6">
            <Card className="p-5" aria-labelledby="prefs">
              <h2 id="prefs" className="text-lg font-bold text-ink">
                Notificações na intranet
              </h2>
              <p className="text-[0.9375rem] text-muted">Escolha sobre o que você quer ser avisado.</p>
              <div className="mt-2">
                <NotificationPreferences prefs={prefs} />
              </div>
            </Card>
            <Card className="p-0" aria-labelledby="seg">
              <Link href="/perfil/seguranca" className="flex items-center gap-4 p-5 hover:bg-canvas">
                <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                  <KeyRound className="size-6" />
                </span>
                <span className="flex-1">
                  <span id="seg" className="block font-bold text-ink">
                    Senha e segurança
                  </span>
                  <span className="block text-sm text-muted">Último acesso: {p.lastLoginAt ? fmtDateTime(p.lastLoginAt) : "—"}</span>
                </span>
                <ChevronRight className="size-5 text-ink/70" aria-hidden />
              </Link>
            </Card>
            <Card className="flex gap-3 p-5">
              <ShieldCheck className="size-6 shrink-0 text-brand-600" aria-hidden />
              <p className="text-sm text-muted">
                <span className="block font-semibold text-ink">Seus dados pessoais</span>
                A REALSEG trata seus dados conforme a LGPD, apenas para finalidades de gestão do vínculo de trabalho. Para solicitar acesso, correção ou informações sobre o tratamento, fale com o RH.
              </p>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
