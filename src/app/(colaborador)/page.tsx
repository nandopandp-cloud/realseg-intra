import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, CircleHelp, Download, FileText, Headphones, Megaphone, Plus, TriangleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { FileIcon } from "@/components/ui/file-icon";
import { Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { TONE } from "@/components/ui/icons";
import { PersonalizeShortcuts } from "@/features/home/personalize";
import { SHORTCUTS } from "@/features/home/shortcuts";
import { TicketStatusBadge } from "@/features/tickets/status-badge";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateLong, fmtTicketNumber } from "@/lib/format";
import { displayName } from "@/server/auth/actor";
import { requireCtx } from "@/server/auth/current";
import { homeData } from "@/server/services/home";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  const ctx = await requireCtx();
  const data = await homeData(ctx);
  const firstName = displayName(ctx.actor);

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
      {/* Boas-vindas */}
      <section aria-labelledby="boas-vindas" className="relative overflow-hidden rounded-[var(--radius-card)] border-line bg-gradient-to-br from-canvas to-surface lg:border lg:shadow-[var(--shadow-card)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] lg:w-[58%]" aria-hidden>
          <Image src="/images/mhero-home.jpg" alt="" fill priority sizes="50vw" className="object-cover object-left lg:hidden" />
          <Image src="/images/hero-home.jpg" alt="" fill priority sizes="60vw" className="hidden object-cover object-right lg:block" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/50 to-transparent lg:from-surface lg:via-surface/0" />
        </div>
        <div className="relative px-2 py-6 sm:px-6 lg:px-10 lg:py-10">
          <p className="eyebrow">Área do colaborador</p>
          <h1 id="boas-vindas" className="mt-3 text-[3rem] leading-[1.02] font-extrabold tracking-tight text-ink lg:text-[3.5rem]">
            Olá,
            <br className="lg:hidden" /> <span className="text-brand-500">{firstName}!</span>
          </h1>
          <p className="mt-4 max-w-[17rem] text-[1.125rem] leading-snug text-muted sm:max-w-sm lg:max-w-md lg:text-[1.25rem]">Tudo o que você precisa para o seu dia a dia, em um só lugar.</p>
          <span className="mt-5 block h-1 w-12 rounded-full bg-brand-500" aria-hidden />
        </div>
      </section>

      {/* Pendências que exigem ação */}
      {data.pending.length > 0 && (
        <section aria-labelledby="pendencias" className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
          <h2 id="pendencias" className="flex items-center gap-2 text-base font-bold text-ink">
            <TriangleAlert className="size-5 text-amber-600" aria-hidden />
            Para você resolver
          </h2>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {data.pending.map((p) => (
              <li key={p.key}>
                <Link href={p.href} className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-[0.9375rem] text-ink hover:text-brand-700">
                  <span className="size-2 shrink-0 rounded-full bg-amber-600" aria-hidden />
                  <span className="flex-1">{p.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Acesso rápido */}
      <section aria-labelledby="acesso-rapido" className="mt-7">
        <SectionHeader title="Acesso rápido" id="acesso-rapido" action={<PersonalizeShortcuts current={data.shortcuts} />} className="mb-4" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 [&>li]:min-w-0">
          {data.shortcuts.map((key) => {
            const s = SHORTCUTS[key];
            if (!s) return null;
            const Icon = s.icon;
            return (
              <li key={key}>
                <Link href={s.href} className={cn("group relative flex h-full min-h-40 flex-col rounded-[var(--radius-card)] border border-line/70 bg-gradient-to-br to-surface p-4 transition-shadow hover:shadow-[var(--shadow-raised)] sm:p-6", s.card)}>
                  <span className={cn("inline-flex size-14 items-center justify-center rounded-2xl", TONE[s.tone].soft, TONE[s.tone].icon)} aria-hidden>
                    <Icon className="size-7" strokeWidth={2} />
                  </span>
                  <span className="mt-4 text-[1.125rem] font-bold text-ink sm:text-[1.25rem]">{s.title}</span>
                  <span className="mt-1 text-[0.9375rem] leading-snug text-muted">{s.subtitle}</span>
                  <ChevronRight className="absolute top-6 right-4 size-6 text-ink transition-transform group-hover:translate-x-0.5 sm:top-14 sm:right-6" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Comunicado importante */}
      {data.highlight ? (
        <section aria-labelledby="comunicado-importante" className="relative mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-brand-50 to-surface lg:from-surface">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] sm:block" aria-hidden>
            <Image src={data.highlight.category.slug === "operacoes" ? "/images/banner-uniforme.jpg" : "/images/mhero-comunicados.jpg"} alt="" fill sizes="40vw" className="object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/20 to-transparent" />
          </div>
          <div className="relative p-5 sm:max-w-[66%] sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-3 font-mono text-sm font-medium tracking-[0.16em] text-brand-700 uppercase">
                <Megaphone className="size-6 text-brand-600" aria-hidden /> Comunicado importante
              </p>
              {data.highlight.publishedAt && <p className="text-sm text-muted">{fmtDateLong(data.highlight.publishedAt)}</p>}
            </div>
            <h2 id="comunicado-importante" className="mt-4 text-[1.5rem] leading-tight font-bold tracking-tight text-ink sm:text-[1.875rem]">
              {data.highlight.title}
            </h2>
            <p className="mt-2 text-[1rem] leading-relaxed text-muted sm:text-[1.0625rem]">{data.highlight.summary}</p>
            {data.highlight.requiresAck && !data.highlight.isAcknowledged && (
              <p className="mt-3 text-sm font-semibold text-amber-700">Requer confirmação de leitura.</p>
            )}
            <ButtonLink href={`/comunicados/${data.highlight.id}`} size="lg" className="mt-6 rounded-xl px-7" iconRight={<ArrowRight className="size-5" aria-hidden />}>
              Ler comunicado
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Minhas solicitações */}
        <Card className="p-4 sm:p-6" aria-labelledby="home-solicitacoes">
          <SectionHeader title="Minhas solicitações" id="home-solicitacoes" href="/solicitacoes" linkLabel="Ver todas" className="mb-3" />
          {data.tickets.length === 0 ? (
            <EmptyState
              icon={Headphones}
              title="Nenhuma solicitação em andamento"
              description="Precisa de algo do RH, TI, Serviços ou Facilities? Abra uma solicitação e acompanhe por aqui."
              action={<ButtonLink href="/solicitacoes/nova" icon={<Plus className="size-5" aria-hidden />}>Nova solicitação</ButtonLink>}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/solicitacoes/${t.number}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 hover:bg-canvas sm:gap-4 sm:px-4">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
                      <Headphones className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {fmtTicketNumber(t.number)} - {t.subject}
                      </span>
                      <span className="block text-sm text-muted">
                        {t.category.name} • Aberto em {fmtDate(t.createdAt)}
                      </span>
                      <span className="mt-1.5 block sm:hidden">
                        <TicketStatusBadge status={t.status} />
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <TicketStatusBadge status={t.status} />
                    </span>
                    <ChevronRight className="hidden size-5 shrink-0 text-ink/70 sm:block" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Documentos recentes */}
        <Card className="p-4 sm:p-6" aria-labelledby="home-documentos">
          <SectionHeader title="Meus documentos recentes" id="home-documentos" href="/documentos" className="mb-3" />
          {data.docs.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum documento recebido ainda" description="Quando o RH disponibilizar holerites, comprovantes ou avisos, eles aparecerão aqui." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 sm:gap-4 sm:px-4">
                  <FileIcon mimeType={d.file.mimeType} />
                  <Link href={`/documentos/${d.id}`} className="min-w-0 flex-1 rounded hover:underline">
                    <span className="block truncate font-semibold text-ink">{d.title}</span>
                    <span className="block text-sm text-muted">Recebido em {fmtDate(d.createdAt)}</span>
                  </Link>
                  <a href={`/api/v1/documents/${d.id}/file?disposition=attachment`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label={`Baixar ${d.title}`}>
                    <Download className="size-5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link href="/ajuda" className="mt-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-4 hover:bg-brand-100 sm:p-5">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-600" aria-hidden>
          <CircleHelp className="size-6" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-ink">Precisa de ajuda?</span>
          <span className="block text-[0.9375rem] text-muted">Tutoriais, dúvidas frequentes e contato com o suporte.</span>
        </span>
        <ChevronRight className="size-5 text-ink/70" aria-hidden />
      </Link>
    </div>
  );
}
