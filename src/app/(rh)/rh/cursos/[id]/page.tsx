import type { Metadata } from "next";
import { CircleCheck, Clock, Download, UsersRound, AlarmClock } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { SearchField } from "@/components/ui/filters";
import { LinkTabs } from "@/components/ui/navigation";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { AssignCourse } from "@/features/rh/courses/assign-and-paths";
import { ContentEditor } from "@/features/rh/courses/content-editor";
import { CourseForm, CourseStatusActions } from "@/features/rh/courses/course-form";
import { fmtDate, fmtMinutes } from "@/lib/format";
import { listHref } from "@/lib/url";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { orNotFound } from "@/server/http/page";
import { parseId } from "@/server/http/route";
import { listCourseCategories } from "@/server/services/courses";
import { courseReport, ENROLLMENT_FILTERS, getCourseAdmin } from "@/server/services/rh/courses";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Curso · Gestão" };

const params = z.object({
  aba: z.enum(["dados", "conteudo", "participantes"]).catch("dados"),
  filtro: z.enum(ENROLLMENT_FILTERS).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
});
const STATUS = { draft: { tone: "slate", label: "Rascunho" }, published: { tone: "green", label: "Publicado" }, archived: { tone: "slate", label: "Arquivado" } } as const;
const FILTER_LABEL = { todos: "Todos", "em-andamento": "Em andamento", concluidos: "Concluídos", atrasados: "Atrasados", "nao-iniciados": "Não iniciados" } as const;

export default async function AdminCoursePage({ params: p, searchParams }: PageProps<"/rh/cursos/[id]">) {
  const ctx = await requireRhCtx("course:manage");
  const { id } = await p;
  const sp = params.parse(await searchParams);
  const c = await orNotFound(Promise.resolve().then(() => getCourseAdmin(ctx, parseId(id, "Curso"))));
  const base = `/rh/cursos/${c.id}`;
  const canReport = can(ctx.actor, "course:report");

  return (
    <AdminPage>
      <AdminPageHeader
        title={c.title}
        crumbs={[{ label: "Cursos", href: "/rh/cursos" }]}
        eyebrow={
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
            {c.isMandatory && <Badge tone="red">Obrigatório · {c.mandatoryDueDays} dias</Badge>}
            {c.issuesCertificate && <Badge tone="teal">Certificado</Badge>}
          </div>
        }
        description={`${c.category.name} · ${c.stats.lessonCount} ${c.stats.lessonCount === 1 ? "aula" : "aulas"} · ${fmtMinutes(c.stats.durationMinutes)} · Público: ${c.audienceLabels.join(", ")} (${c.audienceSize})`}
        actions={<CourseStatusActions id={c.id} slug={c.slug} status={c.status} />}
      />
      <LinkTabs
        label="Seções do curso"
        className="mb-5"
        items={[
          { href: base, label: "Dados", active: sp.aba === "dados" },
          { href: `${base}?aba=conteudo`, label: "Conteúdo", count: c.stats.lessonCount, active: sp.aba === "conteudo" },
          ...(canReport ? [{ href: `${base}?aba=participantes`, label: "Participantes", count: c.stats.enrolled, active: sp.aba === "participantes" }] : []),
        ]}
      />
      {sp.aba === "dados" && (
        <CourseForm
          key={c.updatedAt.toISOString()}
          id={c.id}
          categories={await listCourseCategories()}
          audienceOptions={await orgOptions(ctx)}
          initial={{
            title: c.title,
            slug: c.slug,
            summary: c.summary,
            description: c.description,
            categorySlug: c.categorySlug,
            coverImage: c.coverImage,
            isMandatory: c.isMandatory,
            mandatoryDueDays: c.mandatoryDueDays,
            issuesCertificate: c.issuesCertificate,
            audience: c.audience,
          }}
        />
      )}
      {sp.aba === "conteudo" && <ContentEditor courseId={c.id} modules={c.modules} />}
      {sp.aba === "participantes" && canReport && <Participants courseId={c.id} sp={sp} base={base} ctx={ctx} audienceSize={c.audienceSize} dueDays={c.mandatoryDueDays} published={c.status === "published"} />}
    </AdminPage>
  );
}

async function Participants({ courseId, sp, base, ctx, audienceSize, dueDays, published }: { courseId: string; sp: z.infer<typeof params>; base: string; ctx: Awaited<ReturnType<typeof requireRhCtx>>; audienceSize: number; dueDays: number | null; published: boolean }) {
  const r = await courseReport(ctx, courseId, { filter: sp.filtro, q: sp.q });
  const href = (patch: Record<string, string | undefined>) => listHref(base, { aba: "participantes", filtro: sp.filtro, q: sp.q }, patch, { filtro: "todos" });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-muted">Pessoas do público e quem foi matriculado, com progresso e prazo.</p>
        <div className="flex gap-2">
          {can(ctx.actor, "report:export") && (
            <a href={`/api/v1/rh/courses/${courseId}/report`} className={buttonClasses("outline")}>
              <Download className="size-5" aria-hidden /> Exportar CSV
            </a>
          )}
          <AssignCourse courseId={courseId} audienceSize={audienceSize} defaultDueDays={dueDays} published={published} />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <li>
          <StatTile icon={UsersRound} tone="teal" label="Pessoas" value={r.totals.people} hint={`${r.totals.notStarted} não iniciaram`} />
        </li>
        <li>
          <StatTile icon={Clock} tone="blue" label="Em andamento" value={r.totals.inProgress} />
        </li>
        <li>
          <StatTile icon={CircleCheck} tone="green" label="Concluíram" value={r.totals.completed} />
        </li>
        <li>
          <StatTile icon={AlarmClock} tone="red" label="Atrasados" value={r.totals.overdue} alert={r.totals.overdue > 0} />
        </li>
      </ul>
      <Card className="p-4 sm:p-5">
        <LinkTabs label="Filtrar" size="sm" items={ENROLLMENT_FILTERS.map((f) => ({ href: href({ filtro: f }), label: FILTER_LABEL[f], active: sp.filtro === f }))} />
        <SearchField label="Buscar participante" placeholder="Nome ou matrícula" defaultValue={sp.q} hidden={{ aba: "participantes", filtro: sp.filtro }} className="mt-4 md:max-w-md" />
        {r.items.length === 0 ? (
          <EmptyState icon={UsersRound} title="Ninguém nesta lista" className="mt-6" />
        ) : (
          <Table caption="Participantes do curso" className="mt-4">
            <thead>
              <tr>
                <Th>Colaborador</Th>
                <Th>Unidade</Th>
                <Th className="w-48">Progresso</Th>
                <Th>Prazo</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((i) => (
                <Tr key={i.employeeId}>
                  <Td>
                    <span className="block font-semibold">{i.name}</span>
                    <span className="block text-sm text-muted">
                      {i.registration} · {i.position}
                    </span>
                  </Td>
                  <Td className="text-sm">{i.unit}</Td>
                  <Td>{i.status ? <ProgressBar value={i.progress} label={`${i.progress}% concluído`} className="h-1.5" /> : <span className="text-sm text-muted">—</span>}</Td>
                  <Td className="text-sm whitespace-nowrap">{i.dueAt ? fmtDate(i.dueAt) : "—"}</Td>
                  <Td>
                    {i.status === "concluido" ? (
                      <Badge tone="green">Concluído {i.completedAt ? fmtDate(i.completedAt) : ""}</Badge>
                    ) : i.overdue ? (
                      <Badge tone="red">Atrasado</Badge>
                    ) : i.status ? (
                      <Badge tone="blue">{i.progress}%</Badge>
                    ) : (
                      <Badge tone="slate">Não iniciou</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
