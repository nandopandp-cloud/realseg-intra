import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Briefcase, Plus, Target } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { LinkTabs } from "@/components/ui/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { BandDialogButton, GoalDialogButton } from "@/features/rh/career/career-forms";
import { EmployeeJump } from "@/features/rh/employee-jump";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { listHref } from "@/lib/url";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { listBandsAdmin, listGoals, listOpportunitiesAdmin, OPPORTUNITY_TABS } from "@/server/services/rh/career";
import { courseOptions } from "@/server/services/rh/courses";
import { employeeBrief } from "@/server/services/rh/employee-search";

export const metadata: Metadata = { title: "Carreira · Gestão" };

const params = z.object({
  aba: z.enum(["oportunidades", "faixas", "desenvolvimento"]).catch("oportunidades"),
  situacao: z.enum(OPPORTUNITY_TABS).catch("abertas"),
  q: z.string().max(100).optional().catch(undefined),
  colaborador: z.uuid().optional().catch(undefined),
});
const SIT = { abertas: "Abertas", rascunhos: "Rascunhos", encerradas: "Encerradas" } as const;
const GOAL = { pendente: { tone: "slate", label: "Pendente" }, em_andamento: { tone: "blue", label: "Em andamento" }, concluida: { tone: "green", label: "Concluída" } } as const;

export default async function AdminCareerPage({ searchParams }: PageProps<"/rh/carreira">) {
  const ctx = await requireRhCtx("career:manage");
  const sp = params.parse(await searchParams);
  const canBands = can(ctx.actor, "salary_band:read:any");

  return (
    <AdminPage>
      <AdminPageHeader
        title="Carreira"
        description="Oportunidades internas e candidaturas, faixas salariais do plano de cargos e planos de desenvolvimento individuais."
        actions={
          sp.aba === "oportunidades" ? (
            <ButtonLink href="/rh/carreira/oportunidades/nova" icon={<Plus className="size-5" aria-hidden />}>
              Nova oportunidade
            </ButtonLink>
          ) : undefined
        }
      />
      <LinkTabs
        label="Seções de carreira"
        className="mb-5"
        items={[
          { href: "/rh/carreira", label: "Oportunidades", active: sp.aba === "oportunidades" },
          ...(canBands ? [{ href: "/rh/carreira?aba=faixas", label: "Faixas salariais", active: sp.aba === "faixas" }] : []),
          { href: "/rh/carreira?aba=desenvolvimento", label: "Planos de desenvolvimento", active: sp.aba === "desenvolvimento" },
        ]}
      />
      {sp.aba === "oportunidades" && <Opportunities ctx={ctx} sp={sp} />}
      {sp.aba === "faixas" && canBands && <Bands ctx={ctx} />}
      {sp.aba === "desenvolvimento" && <Development ctx={ctx} employeeId={sp.colaborador} />}
    </AdminPage>
  );
}

type Ctx = Awaited<ReturnType<typeof requireRhCtx>>;

async function Opportunities({ ctx, sp }: { ctx: Ctx; sp: z.infer<typeof params> }) {
  const { items, counts } = await listOpportunitiesAdmin(ctx, { tab: sp.situacao, q: sp.q });
  return (
    <Card className="p-4 sm:p-5">
      <LinkTabs label="Situação" size="sm" items={OPPORTUNITY_TABS.map((t) => ({ href: listHref("/rh/carreira", { situacao: sp.situacao, q: sp.q }, { situacao: t }, { situacao: "abertas" }), label: SIT[t], count: counts[t], active: sp.situacao === t }))} />
      <SearchField label="Buscar oportunidades" placeholder="Título ou área" defaultValue={sp.q} hidden={{ situacao: sp.situacao }} className="mt-4 md:max-w-md" />
      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhuma oportunidade" description="Divulgue vagas internas e receba candidaturas dos colaboradores." className="mt-6" />
      ) : (
        <Table caption="Oportunidades internas" className="mt-4">
          <thead>
            <tr>
              <Th>Oportunidade</Th>
              <Th>Local</Th>
              <Th>Inscrições até</Th>
              <Th>Candidaturas</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <Tr key={o.id}>
                <Td className="min-w-[16rem]">
                  <Link href={`/rh/carreira/oportunidades/${o.id}`} className="font-semibold hover:underline">
                    {o.title}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                    {o.areaLabel}
                    {o.position ? ` · ${o.position}` : ""}
                    {o.isHighlighted && <Badge tone="purple">Destaque</Badge>}
                  </span>
                </Td>
                <Td className="text-sm">{o.unit ?? "—"}</Td>
                <Td className="text-sm whitespace-nowrap">{o.closesAt ? fmtDate(o.closesAt) : "Sem prazo"}</Td>
                <Td className="text-sm">
                  {o.total}
                  {o.pending > 0 && (
                    <Badge tone="amber" className="ml-2">
                      {o.pending} para analisar
                    </Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function Bands({ ctx }: { ctx: Ctx }) {
  const positions = await listBandsAdmin(ctx);
  const families = [...new Map(positions.map((p) => [p.familyId, p.familyName])).entries()];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[0.9375rem] text-muted">O colaborador vê, no plano de cargos da sua família, apenas faixas marcadas como visíveis e vigentes. Não há salário individual no sistema.</p>
      {families.map(([fid, fname]) => (
        <Card key={fid} className="p-4 sm:p-5">
          <h2 className="text-lg font-bold text-ink">{fname}</h2>
          <Table caption={`Faixas salariais da família ${fname}`} className="mt-3">
            <thead>
              <tr>
                <Th className="w-36">Nível</Th>
                <Th>Cargo</Th>
                <Th>Faixa vigente</Th>
                <Th>Histórico</Th>
                <Th className="w-28">
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {positions
                .filter((p) => p.familyId === fid)
                .map((p) => (
                  <Tr key={p.id}>
                    <Td className="text-sm whitespace-nowrap">
                      {p.level} · {p.levelLabel}
                    </Td>
                    <Td className="font-semibold">{p.title}</Td>
                    <Td className="text-sm">
                      {p.current ? (
                        <>
                          {fmtCurrency(p.current.minCents)} a {fmtCurrency(p.current.maxCents)}
                          <Badge tone={p.current.visibleToEmployees ? "green" : "slate"} className="ml-2">
                            {p.current.visibleToEmployees ? "Visível" : "Oculta"}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-muted">Sem faixa vigente</span>
                      )}
                    </Td>
                    <Td>
                      <ul className="flex flex-col gap-1">
                        {p.bands.map((b) => (
                          <li key={b.id} className="flex items-center gap-1 text-sm text-muted">
                            desde {fmtDate(b.effectiveFrom)}
                            {b.effectiveUntil ? ` até ${fmtDate(b.effectiveUntil)}` : ""}: {fmtCurrency(b.minCents)}–{fmtCurrency(b.maxCents)}
                            <BandDialogButton positionId={p.id} positionTitle={p.title} band={{ id: b.id, minCents: b.minCents, maxCents: b.maxCents, effectiveFrom: b.effectiveFrom, effectiveUntil: b.effectiveUntil, visibleToEmployees: b.visibleToEmployees }} />
                          </li>
                        ))}
                      </ul>
                    </Td>
                    <Td>
                      <BandDialogButton positionId={p.id} positionTitle={p.title} />
                    </Td>
                  </Tr>
                ))}
            </tbody>
          </Table>
        </Card>
      ))}
    </div>
  );
}

async function Development({ ctx, employeeId }: { ctx: Ctx; employeeId?: string }) {
  const emp = employeeId ? await employeeBrief(ctx, employeeId) : null;
  const [goals, courses] = emp ? await Promise.all([listGoals(ctx, emp.id), courseOptions()]) : [[], []];
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card className="p-5">
        <EmployeeJump base="/rh/carreira?aba=desenvolvimento&colaborador=" value={emp} label="Colaborador" />
        <p className="mt-2 text-sm text-muted">As etapas aparecem para o colaborador em Minha carreira › Próximas etapas.</p>
      </Card>
      {emp &&
        (goals.length === 0 ? (
          <EmptyState icon={Target} title={`${emp.name} ainda não tem etapas`} description="Defina as próximas etapas: cursos, avaliações, metas de desenvolvimento." action={<GoalDialogButton employeeId={emp.id} courses={courses} />} />
        ) : (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Plano de {emp.name.split(" ")[0]}</h2>
              <GoalDialogButton employeeId={emp.id} courses={courses} />
            </div>
            <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
              {goals.map((g, i) => (
                <li key={g.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-6 text-center font-mono text-sm text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{g.title}</span>
                    <span className="block text-sm text-muted">
                      {g.dueDate ? `Prazo ${fmtDate(g.dueDate)}` : "Sem prazo"}
                      {g.courseTitle ? ` · Curso: ${g.courseTitle}` : ""}
                    </span>
                  </span>
                  <Badge tone={GOAL[g.status].tone}>{GOAL[g.status].label}</Badge>
                  <GoalDialogButton employeeId={emp.id} courses={courses} goal={{ id: g.id, title: g.title, description: g.description, startsOn: g.startsOn, dueDate: g.dueDate, courseId: g.courseId, status: g.status }} />
                </li>
              ))}
            </ol>
          </Card>
        ))}
    </div>
  );
}
