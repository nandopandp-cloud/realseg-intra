import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ArrowRight, ChevronLeft, ChevronRight, CloudUpload, Download, FileText, Info } from "lucide-react";
import { z } from "zod";
import { ButtonLink } from "@/components/ui/button";
import { docIconVariant, FileIcon } from "@/components/ui/file-icon";
import { SearchField } from "@/components/ui/filters";
import { iconFor } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { RowMenu } from "@/components/ui/row-menu";
import { DocCategoryBadge } from "@/features/documents/category-badge";
import { DocumentFilters } from "@/features/documents/filters-dialog";
import { cn } from "@/lib/cn";
import { fmtDate, fmtFileSize } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listMyDocuments, listPolicies, myDocumentYears, personalCategories } from "@/server/services/documents";

export const metadata: Metadata = { title: "Meus documentos" };

const params = z.object({
  q: z.string().max(100).optional().catch(undefined),
  categoria: z.string().max(50).optional().catch(undefined),
  ano: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  status: z.enum(["pendente", "ciente"]).optional().catch(undefined),
  /** Celular: "Ver todos" abre a lista completa (busca, filtros e paginação). */
  todos: z.literal("1").optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export default async function MyDocumentsPage({ searchParams }: PageProps<"/documentos">) {
  const ctx = await requireCtx();
  const sp = params.parse(await searchParams);
  const [list, categories, years, policies] = await Promise.all([
    listMyDocuments(ctx, { q: sp.q, category: sp.categoria, year: sp.ano, status: sp.status, page: sp.page }),
    personalCategories(),
    myDocumentYears(ctx),
    listPolicies(ctx),
  ]);
  const filtered = !!(sp.q || sp.categoria || sp.ano || sp.status);
  // No celular, a página inicial mostra o resumo da referência; a lista completa abre em "Ver todos" (ou com filtros/página).
  const fullOnMobile = filtered || !!sp.todos || sp.page > 1;
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.categoria) p.set("categoria", sp.categoria);
    if (sp.ano) p.set("ano", String(sp.ano));
    if (sp.status) p.set("status", sp.status);
    if (sp.todos) p.set("todos", "1");
    if (page > 1) p.set("page", String(page));
    return `/documentos${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {!fullOnMobile && <MobileSummary items={list.items.slice(0, 4)} policies={policies} />}

      <Card className={cn("max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none md:p-5", !fullOnMobile && "hidden md:block")} aria-labelledby="lista-documentos">
        {sp.todos && (
          <Link href="/documentos" className="-mt-1 mb-2 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-brand-600 md:hidden">
            <ChevronLeft className="size-4" aria-hidden /> Resumo de documentos
          </Link>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id="lista-documentos" className="text-xl font-bold text-ink">
              Meus documentos
            </h2>
            <p className="text-[0.9375rem] text-muted">Seus documentos recebidos pela empresa.</p>
          </div>
          <div className="flex gap-2">
            <SearchField label="Buscar documento" placeholder="Buscar documento..." defaultValue={sp.q} hidden={{ categoria: sp.categoria, ano: sp.ano ? String(sp.ano) : undefined, status: sp.status }} className="flex-1 md:w-60" />
            <DocumentFilters categories={categories} years={years} />
          </div>
        </div>

        {list.items.length === 0 ? (
          <EmptyState
            className="mt-5"
            icon={FileText}
            title={filtered ? "Nenhum documento encontrado" : "Você ainda não recebeu documentos"}
            description={filtered ? "Tente outros termos ou limpe os filtros." : "Holerites, comprovantes e avisos enviados pelo RH aparecerão aqui."}
            action={filtered ? <ButtonLink href="/documentos" variant="outline">Limpar filtros</ButtonLink> : undefined}
          />
        ) : (
          <>
            {/* Tabela (desktop) */}
            <div className="mt-5 hidden md:block">
              <table className="w-full text-left text-[0.9375rem]">
                <caption className="sr-only">Documentos recebidos</caption>
                <thead>
                  <tr className="border-b border-line text-sm text-ink">
                    <th scope="col" className="py-2.5 pl-3 font-semibold">Documento</th>
                    <th scope="col" className="py-2.5 font-semibold">Categoria</th>
                    <th scope="col" className="py-2.5 font-semibold">Recebido em</th>
                    <th scope="col" className="hidden py-2.5 font-semibold lg:table-cell">Tamanho</th>
                    <th scope="col" className="py-2.5 pr-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((d) => (
                    <tr key={d.id} className="border-b border-line last:border-0 hover:bg-canvas/70">
                      <td className="py-2 pl-3">
                        <div className="flex items-center gap-3">
                          <FileIcon mimeType={d.file.mimeType} variant={docIconVariant(d.category.slug)} className="h-9 w-7" />
                          <Link href={`/documentos/${d.id}`} className="font-medium text-ink hover:underline">
                            {d.title}
                          </Link>
                          {d.requiresAck && !d.acknowledged && <Badge tone="amber">Ciência pendente</Badge>}
                        </div>
                      </td>
                      <td className="py-2">
                        <DocCategoryBadge name={d.category.name} color={d.category.color} />
                      </td>
                      <td className="py-2 text-muted">{fmtDate(d.createdAt)}</td>
                      <td className="hidden py-2 text-muted lg:table-cell">{fmtFileSize(d.file.sizeBytes)}</td>
                      <td className="py-2 pr-1">
                        <div className="flex justify-end">
                          <a href={`/api/v1/documents/${d.id}/file?disposition=attachment`} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label={`Baixar ${d.title}`}>
                            <Download className="size-5" aria-hidden />
                          </a>
                          <RowMenu label={`Mais ações para ${d.title}`} items={docMenu(d)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Lista (celular) */}
            <ul className="mt-4 flex flex-col gap-2 md:hidden">
              {list.items.map((d) => (
                <MobileDocRow key={d.id} d={d} />
              ))}
            </ul>
            <div className="mt-5">
              <Pagination page={list.page} pageCount={list.pageCount} total={list.total} shown={list.items.length} noun="documentos" makeHref={href} />
            </div>
          </>
        )}
      </Card>

      <aside className="hidden flex-col gap-5 md:flex" aria-label="Envio e documentos importantes">
        <Card className="border-brand-100 bg-brand-50 p-5 xl:border-line xl:bg-surface">
          <div className="flex gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 xl:bg-brand-50" aria-hidden>
              <CloudUpload className="size-7" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">Enviar documento</h2>
              <p className="mt-1 text-[0.9375rem] text-muted">Envie atestados médicos, declarações e outros documentos solicitados pelo RH.</p>
            </div>
          </div>
          <ButtonLink href="/documentos/enviar" size="lg" className="mt-5 w-full" iconRight={<ArrowRight className="size-5" aria-hidden />}>
            Enviar documento
          </ButtonLink>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-canvas px-4 py-3">
            <FileText className="size-5 text-muted" aria-hidden />
            <p className="flex-1 text-sm text-muted">
              <span className="block font-medium text-ink">Tipos aceitos</span>
              PDF, JPG, PNG (até 10 MB)
            </p>
            <Info className="size-4 text-muted" aria-hidden />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-ink">Documentos importantes</h2>
          <p className="mt-1 text-[0.9375rem] text-muted">Acesse os principais documentos e regulamentos da empresa.</p>
          <ul className="mt-3 divide-y divide-line">
            {policies.map((p) => {
              const Icon = iconFor(p.category.icon);
              return (
                <li key={p.id}>
                  <Link href={`/documentos/${p.id}`} className="flex min-h-14 items-center gap-3 py-3 hover:bg-canvas">
                    <Icon className="size-6 shrink-0 text-slate-700" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{p.title}</span>
                      <span className="block text-sm text-muted">{p.description}</span>
                    </span>
                    {p.requiresAck && !p.acknowledged && <Badge tone="amber">Ciência</Badge>}
                    <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

type DocItem = Awaited<ReturnType<typeof listMyDocuments>>["items"][number];
type Policy = Awaited<ReturnType<typeof listPolicies>>[number];

/** Resumo do celular — fiel a referencias/Documentos REALSEG_ Gestão Segura.png. */
function MobileSummary({ items, policies }: { items: DocItem[]; policies: Policy[] }) {
  return (
    <div className="flex flex-col gap-6 md:hidden">
      <section aria-labelledby="docs-recentes">
        <div className="flex items-center justify-between gap-3">
          <h2 id="docs-recentes" className="text-[1.375rem] font-bold tracking-tight text-ink">
            Meus documentos
          </h2>
          <Link href="/documentos?todos=1" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-600">
            Ver todos <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
        {items.length === 0 ? (
          <EmptyState className="mt-2" icon={FileText} title="Você ainda não recebeu documentos" description="Holerites, comprovantes e avisos enviados pelo RH aparecerão aqui." />
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {items.map((d) => (
              <MobileDocRow key={d.id} d={d} />
            ))}
          </ul>
        )}
      </section>

      <Link href="/documentos/enviar" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-brand-50 p-4 hover:bg-brand-100/70">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100/80 text-brand-600" aria-hidden>
          <CloudUpload className="size-7" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-ink">Enviar documento</span>
          <span className="block text-[0.9375rem] leading-snug text-muted">Envie atestados médicos e outros documentos solicitados pelo RH.</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink" aria-hidden />
      </Link>

      {policies.length > 0 && (
        <section aria-labelledby="docs-importantes">
          <h2 id="docs-importantes" className="text-[1.375rem] font-bold tracking-tight text-ink">
            Documentos importantes
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {policies.map((p) => {
              const Icon = iconFor(p.category.icon);
              return (
                <li key={p.id}>
                  <Link href={`/documentos/${p.id}`} className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] hover:bg-canvas">
                    <span className="flex items-start justify-between">
                      <Icon className="size-7 text-slate-700" strokeWidth={1.8} aria-hidden />
                      <ChevronRight className="size-5 text-ink" aria-hidden />
                    </span>
                    <span className="mt-3 block leading-snug font-bold text-ink">{p.title}</span>
                    <span className="mt-1 block text-sm leading-snug text-muted">{p.description}</span>
                    {p.requiresAck && !p.acknowledged && (
                      <span className="mt-2 block">
                        <Badge tone="amber">Ciência pendente</Badge>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

const docMenu = (d: DocItem) => [
  { label: "Visualizar", href: `/api/v1/documents/${d.id}/file?disposition=inline`, external: true },
  { label: "Detalhes e histórico", href: `/documentos/${d.id}` },
  ...(d.requiresAck && !d.acknowledged ? [{ label: "Confirmar ciência", href: `/documentos/${d.id}#ciencia` }] : []),
];

/** Linha de documento do celular (resumo e lista completa). */
function MobileDocRow({ d }: { d: DocItem }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-line bg-surface py-3 pr-0.5 pl-3.5 shadow-[var(--shadow-card)]">
      <FileIcon mimeType={d.file.mimeType} variant={docIconVariant(d.category.slug)} className="h-9 w-7" />
      <Link href={`/documentos/${d.id}`} className="min-w-0 flex-1 py-1">
        <span className="block truncate font-semibold text-ink">{d.title}</span>
        <span className="block truncate text-sm text-muted">
          Recebido em {fmtDate(d.createdAt)} • {fmtFileSize(d.file.sizeBytes)}
        </span>
        {d.requiresAck && !d.acknowledged && (
          <span className="mt-1 block">
            <Badge tone="amber">Ciência pendente</Badge>
          </span>
        )}
      </Link>
      <a href={`/api/v1/documents/${d.id}/file?disposition=attachment`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label={`Baixar ${d.title}`}>
        <Download className="size-5" aria-hidden />
      </a>
      <RowMenu label={`Mais ações para ${d.title}`} items={docMenu(d)} />
    </li>
  );
}
