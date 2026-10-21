import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { GraduationCap, Plus } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { iconFor, ICON_KEYS, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs } from "@/components/ui/navigation";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { PathDialogButton } from "@/features/rh/courses/assign-and-paths";
import { EntityDialogButton, type FieldDef } from "@/features/rh/structure-editor";
import { cn } from "@/lib/cn";
import { fmtMinutes } from "@/lib/format";
import { listHref } from "@/lib/url";
import { TONES } from "@/lib/validation/rh";
import { requireRhCtx } from "@/server/auth/rh";
import { listCourseCategories } from "@/server/services/courses";
import { COURSE_TABS, courseOptions, listCoursesAdmin, listPathsAdmin } from "@/server/services/rh/courses";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Cursos · Gestão" };

const params = z.object({
  aba: z.enum(["cursos", "trilhas", "categorias"]).catch("cursos"),
  situacao: z.enum(COURSE_TABS).catch("todos"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
});
const STATUS = { draft: { tone: "slate", label: "Rascunho" }, published: { tone: "green", label: "Publicado" }, archived: { tone: "slate", label: "Arquivado" } } as const;
const SIT = { todos: "Todos", publicados: "Publicados", rascunhos: "Rascunhos", arquivados: "Arquivados" } as const;

export default async function AdminCoursesPage({ searchParams }: PageProps<"/rh/cursos">) {
  const ctx = await requireRhCtx("course:manage");
  const sp = params.parse(await searchParams);
  const categories = await listCourseCategories();
  const href = (patch: Record<string, string | undefined>) => listHref("/rh/cursos", { aba: sp.aba, situacao: sp.situacao, q: sp.q, categoria: sp.categoria }, patch, { aba: "cursos", situacao: "todos" });
  const catFields: FieldDef[] = [
    { name: "name", label: "Nome", kind: "text", required: true, max: 60 },
    { name: "color", label: "Cor", kind: "select", required: true, options: TONES.map((t) => ({ value: t, label: t })) },
    { name: "icon", label: "Ícone", kind: "select", required: true, options: ICON_KEYS.map((t) => ({ value: t, label: t })) },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Cursos"
        description="Monte cursos com módulos e aulas, defina o público, atribua cursos obrigatórios e acompanhe a conclusão."
        actions={
          <ButtonLink href="/rh/cursos/novo" icon={<Plus className="size-5" aria-hidden />}>
            Novo curso
          </ButtonLink>
        }
      />
      <LinkTabs
        label="Seções de cursos"
        className="mb-5"
        items={[
          { href: "/rh/cursos", label: "Cursos", active: sp.aba === "cursos" },
          { href: "/rh/cursos?aba=trilhas", label: "Trilhas", active: sp.aba === "trilhas" },
          { href: "/rh/cursos?aba=categorias", label: "Categorias", count: categories.length, active: sp.aba === "categorias" },
        ]}
      />
      {sp.aba === "cursos" && <CourseList sp={sp} href={href} ctx={ctx} categories={categories} />}
      {sp.aba === "trilhas" && <Paths ctx={ctx} />}
      {sp.aba === "categorias" && (
        <Card className="p-4 sm:p-5">
          <div className="flex justify-end">
            <EntityDialogButton endpoint="/rh/course-categories" title="Nova categoria" label="Nova categoria" fields={catFields} initial={{ name: "", color: "teal", icon: "graduation-cap" }} />
          </div>
          <Table caption="Categorias de cursos" className="mt-3">
            <thead>
              <tr>
                <Th>Categoria</Th>
                <Th>Endereço</Th>
                <Th className="w-16">
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const Icon = iconFor(c.icon);
                const tone = toTone(c.color);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <span className="flex items-center gap-3 font-semibold">
                        <span className={cn("inline-flex size-9 items-center justify-center rounded-lg", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                          <Icon className="size-5" />
                        </span>
                        {c.name}
                      </span>
                    </Td>
                    <Td className="font-mono text-sm text-muted">{c.slug}</Td>
                    <Td>
                      <EntityDialogButton variant="edit" id={c.id} endpoint="/rh/course-categories" title={`Editar categoria: ${c.name}`} label={`Editar ${c.name}`} fields={catFields} initial={{ name: c.name, color: c.color, icon: c.icon }} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </AdminPage>
  );
}

type Sp = z.infer<typeof params>;
type Ctx = Awaited<ReturnType<typeof requireRhCtx>>;

async function CourseList({ sp, href, ctx, categories }: { sp: Sp; href: (p: Record<string, string | undefined>) => string; ctx: Ctx; categories: Array<{ slug: string; name: string }> }) {
  const { items, counts } = await listCoursesAdmin(ctx, { tab: sp.situacao, q: sp.q, category: sp.categoria });
  return (
    <Card className="p-4 sm:p-5">
      <LinkTabs label="Situação" size="sm" items={COURSE_TABS.map((t) => ({ href: href({ situacao: t }), label: SIT[t], count: counts[t], active: sp.situacao === t }))} />
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <SearchField label="Buscar cursos" placeholder="Título ou resumo" defaultValue={sp.q} hidden={{ situacao: sp.situacao, categoria: sp.categoria }} className="md:max-w-md md:flex-1" />
        <FilterSelect name="categoria" label="Categoria" options={[{ value: "", label: "Todas as categorias" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} className="md:w-56" />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Nenhum curso encontrado" description="Crie um curso, adicione as aulas e publique no catálogo." className="mt-6" />
      ) : (
        <Table caption="Cursos" className="mt-4">
          <thead>
            <tr>
              <Th>Curso</Th>
              <Th>Situação</Th>
              <Th>Conteúdo</Th>
              <Th className="w-56">Conclusão</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const Icon = iconFor(c.category.icon);
              const tone = toTone(c.category.color);
              const pct = c.enrolled ? Math.round((c.completed / c.enrolled) * 100) : 0;
              return (
                <Tr key={c.id}>
                  <Td className="min-w-[18rem]">
                    <div className="flex items-start gap-3">
                      <span className={cn("mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/rh/cursos/${c.id}`} className="font-semibold hover:underline">
                          {c.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="text-sm text-muted">{c.category.name}</span>
                          {c.isMandatory && <Badge tone="red">Obrigatório</Badge>}
                          {c.issuesCertificate && <Badge tone="teal">Certificado</Badge>}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  </Td>
                  <Td className="text-sm whitespace-nowrap text-muted">
                    {c.lessonCount} {c.lessonCount === 1 ? "aula" : "aulas"} · {fmtMinutes(c.durationMinutes)}
                  </Td>
                  <Td>
                    {c.enrolled ? (
                      <Link href={`/rh/cursos/${c.id}?aba=participantes`} className="block rounded-lg hover:bg-canvas">
                        <p className="text-sm">
                          <strong>{pct}%</strong> · {c.completed} de {c.enrolled} concluíram
                          {c.overdue > 0 && <span className="font-semibold text-red-700"> · {c.overdue} atrasados</span>}
                        </p>
                        <ProgressBar value={pct} label={`${c.completed} de ${c.enrolled} concluíram`} className="mt-1 h-1.5" />
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">Sem matrículas</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function Paths({ ctx }: { ctx: Ctx }) {
  const [paths, courses, org] = await Promise.all([listPathsAdmin(ctx), courseOptions(), orgOptions(ctx)]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PathDialogButton courses={courses} families={org.families} icons={ICON_KEYS} />
      </div>
      {paths.length === 0 && <EmptyState icon={GraduationCap} title="Nenhuma trilha" description="Agrupe cursos em uma sequência recomendada, por exemplo para uma família profissional." />}
      {paths.map((p) => {
        const Icon = iconFor(p.icon);
        const tone = toTone(p.color);
        return (
          <Card key={p.id} className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-ink">{p.title}</h2>
                <p className="text-sm text-muted">
                  {p.courses.length} {p.courses.length === 1 ? "curso" : "cursos"}
                  {p.familyName ? ` · Família ${p.familyName}` : ""}
                </p>
                {p.description && <p className="mt-1 text-[0.9375rem] text-ink">{p.description}</p>}
                <ol className="mt-2 flex flex-wrap gap-1.5">
                  {p.courses.map((c, i) => (
                    <li key={c.courseId}>
                      <Badge tone={c.status === "published" ? "teal" : "slate"}>
                        {i + 1}. {c.title}
                      </Badge>
                    </li>
                  ))}
                </ol>
              </div>
              <PathDialogButton
                courses={courses}
                families={org.families}
                icons={ICON_KEYS}
                initial={{ id: p.id, title: p.title, description: p.description, color: p.color, icon: p.icon, jobFamilyId: p.jobFamilyId ?? "", courseIds: p.courses.map((c) => c.courseId) }}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
