import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { AlarmClock, CircleCheck, FileClock, GraduationCap, Headphones, Megaphone, UserRoundX, UsersRound, Briefcase, ScrollText, Settings2 } from "lucide-react";
import { AdminPage } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { rhHref } from "@/components/layout/rh-nav";
import { Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { SlaMeter } from "@/features/tickets/sla-meter";
import { SubmissionStatusBadge } from "@/features/tickets/status-badge";
import { fmtRelative, fmtTicketNumber, plural } from "@/lib/format";
import { can, displayName } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { rhDashboard } from "@/server/services/rh/dashboard";

export const metadata: Metadata = { title: "Painel de gestão" };

export default async function RhDashboardPage() {
  const ctx = await requireRhCtx();
  const d = await rhDashboard(ctx);
  const t = d.tickets;
  const onTime = t && t.resolvidas30 > 0 ? Math.round((t.noPrazo30 / t.resolvidas30) * 100) : null;

  return (
    <AdminPage>
      <header className="mb-7">
        <p className="eyebrow">Gestão · RH</p>
        <h1 className="mt-2 text-[1.875rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.25rem]">
          Olá, <span className="text-brand-500">{displayName(ctx.actor)}</span>
        </h1>
        <p className="mt-1.5 text-base text-muted">O que precisa da sua atenção hoje na intranet.</p>
      </header>

      {!t && !d.submissions && !d.people && !d.content && !d.learning && !d.career && (
        <Card className="mb-6 p-5" aria-labelledby="admin-atalhos">
          <h2 id="admin-atalhos" className="text-lg font-bold text-ink">
            Administração
          </h2>
          <p className="mt-1 text-[0.9375rem] text-muted">Seu acesso de gestão é de administração do sistema.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {can(ctx.actor, "sla:configure") && (
              <li>
                <Link href="/rh/configuracoes" className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 font-semibold text-ink hover:bg-canvas">
                  <Settings2 className="size-5 text-brand-600" aria-hidden /> Prazos, áreas e calendário
                </Link>
              </li>
            )}
            {can(ctx.actor, "audit:read") && (
              <li>
                <Link href="/rh/auditoria" className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 font-semibold text-ink hover:bg-canvas">
                  <ScrollText className="size-5 text-brand-600" aria-hidden /> Trilha de auditoria
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}
      <h2 className="sr-only">Indicadores</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {t && (
          <>
            <li>
              <StatTile icon={Headphones} tone="blue" label="Solicitações abertas" value={t.abertas} hint={`${t.semResponsavel} sem responsável · ${t.minhas} com você`} href="/rh/solicitacoes" />
            </li>
            <li>
              <StatTile
                icon={AlarmClock}
                tone={t.atrasadas ? "red" : "amber"}
                label="Fora do prazo"
                value={t.atrasadas}
                hint={`${t.emRisco} em risco de atrasar`}
                href="/rh/solicitacoes?aba=atrasadas"
                alert={t.atrasadas > 0}
              />
            </li>
            <li>
              <StatTile icon={CircleCheck} tone="green" label="Resolvidas no prazo" value={onTime === null ? "—" : `${onTime}%`} hint={`${plural(t.resolvidas30, "resolvida", "resolvidas")} nos últimos 30 dias`} />
            </li>
          </>
        )}
        {d.submissions && (
          <li>
            <StatTile icon={FileClock} tone="amber" label="Documentos para analisar" value={d.submissions.pending} hint="Enviados pelos colaboradores" href={rhHref("/rh/documentos?aba=envios")} />
          </li>
        )}
        {d.people && (
          <>
            <li>
              <StatTile icon={UsersRound} tone="teal" label="Colaboradores ativos" value={d.people.ativos} hint={`${plural(d.people.admissoes30, "admissão", "admissões")} nos últimos 30 dias`} href={rhHref("/rh/colaboradores")} />
            </li>
            <li>
              <StatTile icon={UserRoundX} tone="slate" label="Afastados" value={d.people.afastados} href={rhHref("/rh/colaboradores?situacao=afastado")} />
            </li>
          </>
        )}
        {d.content && (
          <li>
            <StatTile icon={Megaphone} tone="purple" label="Comunicados publicados" value={d.content.publicados30} hint={`Últimos 30 dias · ${plural(d.content.agendados, "agendado", "agendados")} · ${plural(d.content.rascunhos, "rascunho", "rascunhos")}`} href={rhHref("/rh/comunicados")} />
          </li>
        )}
        {d.learning && (
          <li>
            <StatTile
              icon={GraduationCap}
              tone={d.learning.obrigatoriosAtrasados ? "red" : "indigo"}
              label="Cursos obrigatórios atrasados"
              value={d.learning.obrigatoriosAtrasados}
              hint={`${plural(d.learning.concluidos30, "conclusão", "conclusões")} nos últimos 30 dias`}
              href={rhHref("/rh/cursos")}
              alert={d.learning.obrigatoriosAtrasados > 0}
            />
          </li>
        )}
        {d.career && (
          <li>
            <StatTile icon={Briefcase} tone="orange" label="Candidaturas em aberto" value={d.career.candidaturas} hint={`${plural(d.career.abertas, "oportunidade publicada", "oportunidades publicadas")}`} href={rhHref("/rh/carreira")} />
          </li>
        )}
      </ul>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {t && (
          <Card className="p-5" aria-labelledby="urgentes">
            <SectionHeader id="urgentes" title="Prazos mais próximos" href="/rh/solicitacoes" linkLabel="Abrir fila" />
            {t.urgent.length === 0 ? (
              <EmptyState icon={CircleCheck} title="Nenhuma solicitação com prazo correndo" description="Quando houver solicitações abertas, as mais urgentes aparecem aqui." className="mt-3" />
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {t.urgent.map((u) => (
                  <li key={u.id}>
                    <Link href={`/rh/solicitacoes/${u.number}`} className="flex flex-col gap-2 py-3.5 hover:bg-canvas/60 sm:flex-row sm:items-center sm:gap-4">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">
                          <span className="font-mono text-sm text-muted">{fmtTicketNumber(u.number)}</span> {u.subject}
                        </span>
                        <span className="block text-sm text-muted">
                          {u.requester.name} · {u.category.name}
                          {!u.assigneeUserId && <span className="font-semibold text-amber-700"> · sem responsável</span>}
                        </span>
                      </span>
                      <span className="w-full sm:w-44">
                        <SlaMeter sla={u.sla} compact />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {d.submissions && (
          <Card className="p-5" aria-labelledby="envios">
            <SectionHeader id="envios" title="Envios aguardando análise" href={rhHref("/rh/documentos?aba=envios")} />
            {d.submissions.oldest.length === 0 ? (
              <EmptyState icon={CircleCheck} title="Nenhum documento aguardando" description="Atestados e comprovantes enviados pelos colaboradores aparecem aqui." className="mt-3" />
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {d.submissions.oldest.map((s) => (
                  <li key={s.id}>
                    <RowWrap href={rhHref(`/rh/documentos/envios/${s.id}`)} className="flex items-center gap-4 py-3.5 hover:bg-canvas/60">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">
                          <span className="font-mono text-sm text-muted">DOC-{s.number}</span> {s.title}
                        </span>
                        <span className="block text-sm text-muted">
                          {s.employeeName} · {s.categoryName} · {fmtRelative(s.createdAt)}
                        </span>
                      </span>
                      <SubmissionStatusBadge status={s.status} />
                    </RowWrap>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </AdminPage>
  );
}

/** Linha clicável quando o destino existe; caso contrário, apenas o conteúdo. */
function RowWrap({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
