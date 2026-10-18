import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/app-link";
import { ArrowRight, BookOpen, ChevronRight, Download, FileText, Headphones, Plus } from "lucide-react";
import { MegaphoneSolid } from "@/components/ui/solid-icons";
import { ButtonLink } from "@/components/ui/button";
import { FileIcon } from "@/components/ui/file-icon";
import { Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { PersonalizeShortcuts } from "@/features/home/personalize";
import { SHORTCUTS } from "@/features/home/shortcuts";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateLong, fmtTicketNumber } from "@/lib/format";
import { displayName } from "@/server/auth/actor";
import { requireCtx } from "@/server/auth/current";
import { homeData } from "@/server/services/home";

export const metadata: Metadata = { title: "Início" };

/** Home do colaborador — fiel a referencias/Dashboard Corporativo (desktop) e Painel Corporativo (mobile). */
export default async function HomePage() {
  const ctx = await requireCtx();
  const data = await homeData(ctx);
  const firstName = displayName(ctx.actor);

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:pr-8 xl:pl-8">
      {/* Boas-vindas */}
      <section
        aria-labelledby="boas-vindas"
        className="relative -mx-4 -mt-4 overflow-hidden bg-gradient-to-br from-canvas to-surface sm:mx-0 sm:mt-0 sm:rounded-[var(--radius-card)] lg:border lg:border-line lg:shadow-[var(--shadow-card)]"
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[56%] lg:w-[62%]" aria-hidden>
          <Image src="/images/mhero-home.webp" alt="" fill priority sizes="50vw" className="object-cover object-[70%_center] lg:hidden" />
          <Image src="/images/hero-home.webp" alt="" fill priority sizes="60vw" className="hidden object-cover object-right lg:block" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/20 to-transparent lg:via-transparent" />
        </div>
        <div className="relative px-6 pt-6 pb-6 sm:px-6 lg:px-10 lg:pt-9 lg:pb-6">
          <p className="eyebrow">Área do colaborador</p>
          <h1 id="boas-vindas" className="mt-2.5 text-[2.5rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-ink lg:mt-4 lg:text-[3.25rem]">
            Olá,
            <br className="lg:hidden" /> <span className="text-brand-500">{firstName}!</span>
          </h1>
          <p className="mt-3 max-w-[13.75rem] text-[1rem] leading-snug text-muted sm:max-w-[21rem] lg:mt-3 lg:max-w-[21.5rem] lg:text-[1.1875rem]">
            Tudo o que você precisa para o seu dia a dia, em um só lugar.
          </p>
          <span className="mt-4 block h-1 w-12 rounded-full bg-brand-500 lg:mt-6" aria-hidden />
        </div>
      </section>

      {/* Acesso rápido */}
      <section aria-labelledby="acesso-rapido" className="mt-6 lg:mt-8">
        <SectionHeader title="Acesso rápido" id="acesso-rapido" action={<span className="hidden sm:contents"><PersonalizeShortcuts current={data.shortcuts} /></span>} className="mb-3 max-sm:sr-only lg:mb-4" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 [&>li]:min-w-0">
          {data.shortcuts.map((key) => {
            const s = SHORTCUTS[key];
            if (!s) return null;
            const Icon = s.icon;
            const badge = data.badges[key];
            return (
              <li key={key}>
                <Link
                  href={s.href}
                  className={cn(
                    "group relative flex h-full min-h-[7.5rem] flex-col rounded-[var(--radius-card)] border border-line/50 bg-gradient-to-br to-surface px-3.5 pt-4 pb-3.5 transition-shadow hover:shadow-[var(--shadow-raised)] sm:min-h-[10rem] sm:p-5",
                    s.card,
                  )}
                >
                  <span className={cn("inline-flex self-start items-center justify-center sm:size-14 sm:rounded-2xl lg:size-[3.75rem]", s.iconColor, s.tile)} aria-hidden>
                    <Icon className="size-9 sm:size-7 lg:size-8" />
                  </span>
                  <span className="mt-3 pr-1 text-[0.9375rem] leading-tight font-bold tracking-[-0.02em] whitespace-nowrap text-ink sm:text-[1.125rem] sm:whitespace-normal lg:text-[1.1875rem]">{s.title}</span>
                  <span className="mt-0.5 text-[0.78rem] leading-snug tracking-[-0.015em] text-muted sm:hidden">{s.short}</span>
                  <span className="mt-1.5 hidden max-w-[11rem] pr-6 text-[0.9375rem] leading-snug text-muted sm:block">{s.subtitle}</span>
                  {badge && (
                    <>
                      {/* Celular: sem selo visível, como na referência (o texto vai para leitores de tela). Desktop: selo com texto. */}
                      <span className="sr-only sm:hidden">{badge}</span>
                      <span className="absolute top-4 right-4 hidden items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 sm:inline-flex">
                        <span className="size-1.5 rounded-full bg-amber-600" aria-hidden />
                        {badge}
                      </span>
                    </>
                  )}
                  <ChevronRight className="absolute top-[2.6rem] right-3 size-5 text-ink transition-transform group-hover:translate-x-0.5 sm:top-1/2 sm:right-5 sm:size-6 sm:-translate-y-1/2" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Comunicado importante */}
      {data.highlight && (
        <section aria-labelledby="comunicado-importante" className="relative mt-4 overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-brand-50 to-surface lg:mt-5 lg:from-surface">
          <div className="pointer-events-none absolute right-0 bottom-0 h-[64%] w-[42%] sm:inset-y-0 sm:h-auto sm:w-[44%]" aria-hidden>
            <Image src={data.highlight.category.slug === "operacoes" ? "/images/banner-uniforme.webp" : "/images/mhero-comunicados.webp"} alt="" fill sizes="45vw" className="object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/10 to-transparent" />
          </div>
          <div className="relative p-5 sm:max-w-[62%] sm:px-8 sm:py-7 lg:pr-0 lg:pl-11">
            <div className="flex items-center justify-between gap-x-3 sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
              <p className="inline-flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.1em] whitespace-nowrap text-brand-700 uppercase sm:gap-3 sm:text-[0.8125rem] sm:tracking-[0.18em]">
                <MegaphoneSolid className="size-5 text-brand-600 sm:size-7" /> Comunicado importante
              </p>
              {data.highlight.publishedAt && <p className="text-xs whitespace-nowrap text-muted sm:text-sm">{fmtDateLong(data.highlight.publishedAt)}</p>}
            </div>
            <h2 id="comunicado-importante" className="mt-3 text-[1.25rem] leading-tight font-bold tracking-[-0.02em] text-ink sm:text-[1.875rem]">
              {data.highlight.title}
            </h2>
            <p className="mt-1.5 max-w-[92%] text-[0.875rem] leading-snug text-muted sm:mt-2 sm:max-w-none sm:text-[1.0625rem]">{data.highlight.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 max-sm:max-w-[62%] sm:mt-5">
              <ButtonLink href={`/comunicados/${data.highlight.id}`} size="lg" className="rounded-full px-5 whitespace-nowrap max-sm:h-12 max-sm:text-[0.9375rem] sm:rounded-xl sm:px-6" iconRight={<ArrowRight className="ml-2 size-5" aria-hidden />}>
                Ler comunicado
              </ButtonLink>
              {data.highlight.requiresAck && !data.highlight.isAcknowledged && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-surface/70 px-3 py-1 text-sm font-semibold text-brand-700">
                  <BookOpen className="size-4" aria-hidden /> Leitura obrigatória
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-4 sm:gap-4 lg:mt-5 lg:grid-cols-[minmax(0,0.97fr)_minmax(0,1fr)] lg:gap-5">
        {/* Minhas solicitações */}
        <Card className="max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none sm:px-5 sm:py-5" aria-labelledby="home-solicitacoes">
          <SectionHeader title="Minhas solicitações" id="home-solicitacoes" href="/solicitacoes" linkLabel="Ver todas" className="mb-2" />
          {data.tickets.length === 0 ? (
            <EmptyState
              icon={Headphones}
              title="Nenhuma solicitação em andamento"
              description="Precisa de algo do RH, TI, Serviços ou Facilities? Abra uma solicitação e acompanhe por aqui."
              action={
                <ButtonLink href="/solicitacoes/nova" icon={<Plus className="size-5" aria-hidden />}>
                  Nova solicitação
                </ButtonLink>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/solicitacoes/${t.number}`} className="flex items-center gap-2.5 rounded-xl border border-line/70 bg-surface px-3 py-3 shadow-[var(--shadow-card)] hover:bg-canvas sm:gap-4 sm:px-4">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 sm:size-12" aria-hidden>
                      <Headphones className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-semibold text-ink sm:text-[0.9375rem]">
                        {fmtTicketNumber(t.number)} - {t.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">
                        {t.category.name} • <span className="max-sm:hidden">Aberto em </span>
                        {fmtDate(t.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <TicketStatusBadge status={t.status} />
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Documentos recentes */}
        <Card className="max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none sm:px-5 sm:py-5" aria-labelledby="home-documentos">
          <SectionHeader title="Meus documentos recentes" id="home-documentos" href="/documentos" className="mb-2" />
          {data.docs.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum documento recebido ainda" description="Quando o RH disponibilizar holerites, comprovantes ou avisos, eles aparecerão aqui." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line/70 bg-surface px-3 py-2.5 shadow-[var(--shadow-card)] sm:gap-4 sm:px-4">
                  <FileIcon mimeType={d.mimeType} variant={d.kind === "atualizado" ? "manual" : "file"} className="h-10 w-8" />
                  <Link href={`/documentos/${d.id}`} className="min-w-0 flex-1 rounded hover:underline">
                    <span className="block truncate text-[0.9375rem] font-medium text-ink">{d.title}</span>
                    <span className="block text-[0.8125rem] text-muted">
                      {d.kind === "atualizado" ? "Atualizado" : "Recebido"} em {fmtDate(d.at)}
                    </span>
                  </Link>
                  <a
                    href={`/api/v1/documents/${d.id}/file?disposition=attachment`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink"
                    aria-label={`Baixar ${d.title}`}
                  >
                    <Download className="size-5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 flex justify-center sm:hidden">
        <PersonalizeShortcuts current={data.shortcuts} />
      </div>
    </div>
  );
}
