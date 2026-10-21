import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { BookOpen, FileText, FileUp, Inbox, Plus } from "lucide-react";
import { z } from "zod";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect, SearchField } from "@/components/ui/filters";
import { LinkTabs, Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { SubmissionStatusBadge } from "@/features/tickets/status-badge";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { listHref } from "@/lib/url";
import { can } from "@/server/auth/actor";
import { requireRhCtx } from "@/server/auth/rh";
import { submissionCategories } from "@/server/services/documents";
import { documentCategoryOptions, listInstitutionalAdmin, listPersonalAdmin, listSubmissionsAdmin, periodLabel, PERSONAL_FILTERS, SUBMISSION_TABS } from "@/server/services/rh/documents";

export const metadata: Metadata = { title: "Documentos · Gestão" };

const params = z.object({
  aba: z.enum(["envios", "pessoais", "normas"]).optional().catch(undefined),
  situacao: z.string().max(20).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

const SUB_LABEL = { analisar: "Para analisar", aceitos: "Aceitos", recusados: "Recusados", todos: "Todos" } as const;
const PERSONAL_LABEL = { todos: "Todos", pendentes: "Ciência pendente", cientes: "Com ciência" } as const;

export default async function AdminDocumentsPage({ searchParams }: PageProps<"/rh/documentos">) {
  const ctx = await requireRhCtx("document:manage");
  const sp = params.parse(await searchParams);
  const canReview = can(ctx.actor, "submission:review");
  const aba = sp.aba ?? (canReview ? "envios" : "pessoais");
  const current = { aba, situacao: sp.situacao, q: sp.q, categoria: sp.categoria, page: sp.page };
  const href = (patch: Record<string, string | number | undefined>) => listHref("/rh/documentos", current, patch);
  const tabs = [
    ...(canReview ? [{ key: "envios", label: "Envios dos colaboradores", icon: <Inbox className="size-4" aria-hidden /> }] : []),
    { key: "pessoais", label: "Documentos distribuídos", icon: <FileText className="size-4" aria-hidden /> },
    { key: "normas", label: "Normas e manuais", icon: <BookOpen className="size-4" aria-hidden /> },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Documentos"
        description="Analise o que os colaboradores enviam, distribua documentos pessoais (inclusive em lote) e mantenha normas e manuais atualizados."
        actions={
          <>
            <ButtonLink href="/rh/documentos/normas/nova" variant="outline" icon={<Plus className="size-5" aria-hidden />}>
              Nova norma
            </ButtonLink>
            <ButtonLink href="/rh/documentos/distribuir" icon={<FileUp className="size-5" aria-hidden />}>
              Distribuir documento
            </ButtonLink>
          </>
        }
      />
      <LinkTabs label="Seções de documentos" items={tabs.map((t) => ({ href: listHref("/rh/documentos", {}, { aba: t.key }), label: t.label, icon: t.icon, active: aba === t.key }))} className="mb-5" />
      {aba === "envios" && canReview && <Submissions sp={sp} href={href} ctx={ctx} />}
      {aba === "pessoais" && <Personal sp={sp} href={href} ctx={ctx} />}
      {aba === "normas" && <Policies q={sp.q} archived={sp.situacao === "arquivados"} ctx={ctx} href={href} />}
    </AdminPage>
  );
}

type Sp = z.infer<typeof params>;
type Href = (patch: Record<string, string | number | undefined>) => string;
type Ctx = Awaited<ReturnType<typeof requireRhCtx>>;

async function Submissions({ sp, href, ctx }: { sp: Sp; href: Href; ctx: Ctx }) {
  const tab = SUBMISSION_TABS.includes(sp.situacao as never) ? (sp.situacao as (typeof SUBMISSION_TABS)[number]) : "analisar";
  const [list, cats] = await Promise.all([listSubmissionsAdmin(ctx, { tab, q: sp.q, category: sp.categoria, page: sp.page }), submissionCategories()]);
  return (
    <Card className="p-4 sm:p-5">
      <LinkTabs label="Situação dos envios" size="sm" items={SUBMISSION_TABS.map((t) => ({ href: href({ situacao: t === "analisar" ? undefined : t }), label: SUB_LABEL[t], count: list.counts[t], active: tab === t }))} />
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <SearchField label="Buscar envios" placeholder="Protocolo, título, nome ou matrícula" defaultValue={sp.q} hidden={{ aba: "envios", situacao: sp.situacao, categoria: sp.categoria }} className="md:max-w-md md:flex-1" />
        <FilterSelect name="categoria" label="Tipo" options={[{ value: "", label: "Todos os tipos" }, ...cats.map((c) => ({ value: c.slug, label: c.name }))]} className="md:w-56" />
      </div>
      {list.items.length === 0 ? (
        <EmptyState icon={Inbox} title={tab === "analisar" ? "Nenhum envio aguardando análise" : "Nenhum envio encontrado"} description="Atestados, declarações e comprovantes enviados pelos colaboradores aparecem aqui." className="mt-6" />
      ) : (
        <>
          <Table caption="Envios dos colaboradores" className="mt-4">
            <thead>
              <tr>
                <Th>Protocolo</Th>
                <Th>Documento</Th>
                <Th>Colaborador</Th>
                <Th>Enviado</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-mono text-sm whitespace-nowrap">
                    <Link href={`/rh/documentos/envios/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                      DOC-{s.number}
                    </Link>
                  </Td>
                  <Td className="min-w-[14rem]">
                    <Link href={`/rh/documentos/envios/${s.id}`} className="font-semibold hover:underline">
                      {s.title}
                    </Link>
                    <span className="block text-sm text-muted">
                      {s.category.name}
                      {s.referenceDate ? ` · ref. ${fmtDate(s.referenceDate)}` : ""}
                    </span>
                  </Td>
                  <Td>
                    {s.employee.name}
                    <span className="block font-mono text-xs text-muted">Matrícula {s.employee.registration}</span>
                  </Td>
                  <Td className="text-sm whitespace-nowrap text-muted" title={fmtDateTime(s.createdAt)}>
                    {fmtRelative(s.createdAt)}
                  </Td>
                  <Td>
                    <SubmissionStatusBadge status={s.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4">
            <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="envios" makeHref={(page) => href({ page })} />
          </div>
        </>
      )}
    </Card>
  );
}

async function Personal({ sp, href, ctx }: { sp: Sp; href: Href; ctx: Ctx }) {
  const filter = PERSONAL_FILTERS.includes(sp.situacao as never) ? (sp.situacao as (typeof PERSONAL_FILTERS)[number]) : "todos";
  const [list, cats] = await Promise.all([listPersonalAdmin(ctx, { q: sp.q, category: sp.categoria, filter, page: sp.page }), documentCategoryOptions("personal")]);
  return (
    <Card className="p-4 sm:p-5">
      <LinkTabs label="Ciência" size="sm" items={PERSONAL_FILTERS.map((f) => ({ href: href({ situacao: f === "todos" ? undefined : f }), label: PERSONAL_LABEL[f], active: filter === f }))} />
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <SearchField label="Buscar documentos" placeholder="Título, nome ou matrícula" defaultValue={sp.q} hidden={{ aba: "pessoais", situacao: sp.situacao, categoria: sp.categoria }} className="md:max-w-md md:flex-1" />
        <FilterSelect name="categoria" label="Tipo" options={[{ value: "", label: "Todos os tipos" }, ...cats.map((c) => ({ value: c.slug, label: c.name }))]} className="md:w-56" />
      </div>
      {list.items.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum documento encontrado" description="Distribua holerites, declarações e avisos individuais pelo botão “Distribuir documento”." className="mt-6" />
      ) : (
        <>
          <Table caption="Documentos distribuídos" className="mt-4">
            <thead>
              <tr>
                <Th>Documento</Th>
                <Th>Colaborador</Th>
                <Th>Enviado em</Th>
                <Th>Ciência</Th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((d) => (
                <Tr key={d.id}>
                  <Td className="min-w-[14rem]">
                    <Link href={`/rh/documentos/${d.id}`} className="font-semibold hover:underline">
                      {d.title}
                    </Link>
                    <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                      {d.category.name}
                      {d.referencePeriod ? ` · ${periodLabel(d.referencePeriod)}` : ""}
                      {d.status === "archived" && <Badge tone="slate">Arquivado</Badge>}
                    </span>
                  </Td>
                  <Td>
                    {d.employee.name}
                    <span className="block font-mono text-xs text-muted">Matrícula {d.employee.registration}</span>
                  </Td>
                  <Td className="text-sm whitespace-nowrap text-muted">{fmtDate(d.createdAt)}</Td>
                  <Td>{!d.requiresAck ? <span className="text-sm text-muted">Não exige</span> : d.acknowledged ? <Badge tone="green">Confirmada</Badge> : <Badge tone="amber">Pendente</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4">
            <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="documentos" makeHref={(page) => href({ page })} />
          </div>
        </>
      )}
    </Card>
  );
}

async function Policies({ q, archived, ctx, href }: { q?: string; archived: boolean; ctx: Ctx; href: Href }) {
  const items = await listInstitutionalAdmin(ctx, { q, status: archived ? "archived" : "active" });
  return (
    <Card className="p-4 sm:p-5">
      <LinkTabs
        label="Situação"
        size="sm"
        items={[
          { href: href({ situacao: undefined }), label: "Vigentes", active: !archived },
          { href: href({ situacao: "arquivados" }), label: "Arquivados", active: archived },
        ]}
      />
      <SearchField label="Buscar normas" placeholder="Título ou descrição" defaultValue={q} hidden={{ aba: "normas", situacao: archived ? "arquivados" : undefined }} className="mt-4 md:max-w-md" />
      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma norma encontrada" description="Publique políticas, manuais e regulamentos para todos os colaboradores." action={<ButtonLink href="/rh/documentos/normas/nova">Nova norma</ButtonLink>} className="mt-6" />
      ) : (
        <Table caption="Normas e manuais" className="mt-4">
          <thead>
            <tr>
              <Th>Documento</Th>
              <Th>Vigência</Th>
              <Th>Versão</Th>
              <Th className="w-56">Ciência</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const pct = d.audience ? Math.round((d.ackCount / d.audience) * 100) : 0;
              return (
                <Tr key={d.id}>
                  <Td className="min-w-[16rem]">
                    <Link href={`/rh/documentos/${d.id}`} className="font-semibold hover:underline">
                      {d.title}
                    </Link>
                    <span className="block text-sm text-muted">{d.category.name}</span>
                  </Td>
                  <Td className="text-sm whitespace-nowrap text-muted">
                    {d.effectiveFrom ? `Desde ${fmtDate(d.effectiveFrom)}` : "—"}
                    {d.effectiveUntil ? <span className="block">até {fmtDate(d.effectiveUntil)}</span> : null}
                  </Td>
                  <Td className="text-sm">v{d.version}</Td>
                  <Td>
                    {d.requiresAck ? (
                      <div>
                        <p className="text-sm">
                          <strong>{pct}%</strong> · {d.ackCount} de {d.audience}
                        </p>
                        <ProgressBar value={pct} label={`${d.ackCount} de ${d.audience} confirmaram ciência`} className="mt-1 h-1.5" tone={pct < 50 ? "amber" : "brand"} />
                      </div>
                    ) : (
                      <span className="text-sm text-muted">Não exige</span>
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
