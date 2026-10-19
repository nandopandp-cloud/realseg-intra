import type { Metadata } from "next";
import { Clock, ShieldCheck, UsersRound } from "lucide-react";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/primitives";
import { TicketForm } from "@/features/tickets/ticket-form";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { requireCtx } from "@/server/auth/current";
import { listTicketCategories, supportHours } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Fale com o RH" };

/** Canal direto com o RH: cria uma solicitação na categoria RH (com protocolo e prazo). */
export default async function TalkToHrPage() {
  if (!FEATURES.talkToHr) notFound();
  await requireCtx();
  const [categories, hours] = await Promise.all([listTicketCategories(), supportHours()]);
  return (
    <>
      <PageHero eyebrow="Recursos Humanos" title="Fale com o RH" subtitle="Envie sua dúvida ou pedido. Você recebe um protocolo e a resposta fica registrada." breadcrumb={[{ label: "Início", href: "/" }, { label: "Fale com o RH" }]} />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="p-4 sm:p-6">
            <TicketForm categories={categories} fixedCategory="rh" submitLabel="Enviar mensagem ao RH" />
          </Card>
          <aside className="flex flex-col gap-4">
            <Card className="flex gap-3 p-5">
              <UsersRound className="size-6 shrink-0 text-brand-600" aria-hidden />
              <p className="text-[0.9375rem] text-muted">
                <span className="block font-semibold text-ink">Quem responde</span>A equipe de Recursos Humanos da sua unidade.
              </p>
            </Card>
            {hours && (
              <Card className="flex gap-3 p-5">
                <Clock className="size-6 shrink-0 text-brand-600" aria-hidden />
                <p className="text-[0.9375rem] text-muted">
                  <span className="block font-semibold text-ink">Horário de atendimento</span>
                  {hours.label}, {hours.hours}. {hours.online ? "Equipe em horário de atendimento agora." : "Fora do horário — responderemos no próximo dia útil."}
                </p>
              </Card>
            )}
            <Card className="flex gap-3 p-5">
              <ShieldCheck className="size-6 shrink-0 text-brand-600" aria-hidden />
              <p className="text-[0.9375rem] text-muted">
                <span className="block font-semibold text-ink">Privacidade</span>Somente você e a equipe autorizada do RH veem esta conversa.
              </p>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
