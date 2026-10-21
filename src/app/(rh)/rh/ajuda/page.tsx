import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { BookOpenText, Plus } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { iconFor, ICON_KEYS, toTone, TONE } from "@/components/ui/icons";
import { LinkTabs } from "@/components/ui/navigation";
import { Card, EmptyState } from "@/components/ui/primitives";
import { EntityDialogButton, type FieldDef } from "@/features/rh/structure-editor";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { listHref } from "@/lib/url";
import { TONES } from "@/lib/validation/rh";
import { requireRhCtx } from "@/server/auth/rh";
import { HELP_TABS, listArticlesAdmin, listHelpCategoriesAdmin } from "@/server/services/rh/help";

export const metadata: Metadata = { title: "Central de ajuda · Gestão" };

const params = z.object({
  aba: z.enum(["artigos", "categorias"]).catch("artigos"),
  situacao: z.enum(HELP_TABS).catch("publicados"),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
});
const SIT = { publicados: "Publicados", rascunhos: "Rascunhos", arquivados: "Arquivados" } as const;
const TYPE = { artigo: "Artigo", tutorial: "Tutorial", faq: "Pergunta frequente" } as const;

export default async function AdminHelpPage({ searchParams }: PageProps<"/rh/ajuda">) {
  const ctx = await requireRhCtx("help:manage");
  const sp = params.parse(await searchParams);
  const categories = await listHelpCategoriesAdmin(ctx);
  const catFields: FieldDef[] = [
    { name: "name", label: "Nome", kind: "text", required: true, max: 60 },
    { name: "description", label: "Descrição", kind: "text", required: true, max: 140 },
    { name: "color", label: "Cor", kind: "select", required: true, options: TONES.map((t) => ({ value: t, label: t })) },
    { name: "icon", label: "Ícone", kind: "select", required: true, options: ICON_KEYS.map((t) => ({ value: t, label: t })) },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Central de ajuda"
        description="Artigos, tutoriais e perguntas frequentes que respondem às dúvidas dos colaboradores antes de virarem solicitação."
        actions={
          <ButtonLink href="/rh/ajuda/artigos/novo" icon={<Plus className="size-5" aria-hidden />}>
            Novo artigo
          </ButtonLink>
        }
      />
      <LinkTabs
        label="Seções da central de ajuda"
        className="mb-5"
        items={[
          { href: "/rh/ajuda", label: "Artigos", active: sp.aba === "artigos" },
          { href: "/rh/ajuda?aba=categorias", label: "Categorias", count: categories.length, active: sp.aba === "categorias" },
        ]}
      />
      {sp.aba === "artigos" ? (
        <Articles ctx={ctx} sp={sp} categories={categories} />
      ) : (
        <Card className="p-4 sm:p-5">
          <div className="flex justify-end">
            <EntityDialogButton endpoint="/rh/help/categories" title="Nova categoria" label="Nova categoria" fields={catFields} initial={{ name: "", description: "", color: "teal", icon: "circle-help" }} />
          </div>
          <Table caption="Categorias da central de ajuda" className="mt-3">
            <thead>
              <tr>
                <Th>Categoria</Th>
                <Th>Artigos</Th>
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
                      <span className="flex items-center gap-3">
                        <span className={cn("inline-flex size-9 items-center justify-center rounded-lg", TONE[tone].tile, TONE[tone].icon)} aria-hidden>
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">{c.name}</span>
                          <span className="block text-sm text-muted">{c.description}</span>
                        </span>
                      </span>
                    </Td>
                    <Td className="text-sm">{c.articles}</Td>
                    <Td>
                      <EntityDialogButton variant="edit" id={c.id} endpoint="/rh/help/categories" title={`Editar categoria: ${c.name}`} label={`Editar ${c.name}`} fields={catFields} initial={{ name: c.name, description: c.description, color: c.color, icon: c.icon }} />
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

async function Articles({ ctx, sp, categories }: { ctx: Awaited<ReturnType<typeof requireRhCtx>>; sp: z.infer<typeof params>; categories: Array<{ slug: string; name: string }> }) {
  const { items, counts } = await listArticlesAdmin(ctx, { tab: sp.situacao, q: sp.q, category: sp.categoria });
  return (
    <Card className="p-4 sm:p-5">
      <LinkTabs label="Situação" size="sm" items={HELP_TABS.map((t) => ({ href: listHref("/rh/ajuda", { situacao: sp.situacao, q: sp.q, categoria: sp.categoria }, { situacao: t }, { situacao: "publicados" }), label: SIT[t], count: counts[t], active: sp.situacao === t }))} />
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <SearchField label="Buscar artigos" placeholder="Título ou resumo" defaultValue={sp.q} hidden={{ situacao: sp.situacao, categoria: sp.categoria }} className="md:max-w-md md:flex-1" />
        <FilterSelect name="categoria" label="Categoria" options={[{ value: "", label: "Todas as categorias" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} className="md:w-56" />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={BookOpenText} title="Nenhum artigo nesta lista" className="mt-6" />
      ) : (
        <Table caption="Artigos" className="mt-4">
          <thead>
            <tr>
              <Th>Artigo</Th>
              <Th>Acessos</Th>
              <Th>Foi útil?</Th>
              <Th>Atualizado</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const votes = a.helpful + a.notHelpful;
              return (
                <Tr key={a.id}>
                  <Td className="min-w-[16rem]">
                    <Link href={`/rh/ajuda/artigos/${a.id}`} className="font-semibold hover:underline">
                      {a.title}
                    </Link>
                    <span className="block text-sm text-muted">
                      {a.category.name} · {TYPE[a.type]}
                    </span>
                  </Td>
                  <Td className="text-sm tabular-nums">{a.viewCount}</Td>
                  <Td className="text-sm">{votes ? `${Math.round((a.helpful / votes) * 100)}% sim (${votes} ${votes === 1 ? "voto" : "votos"})` : "—"}</Td>
                  <Td className="text-sm whitespace-nowrap text-muted">{fmtDate(a.updatedAt)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
