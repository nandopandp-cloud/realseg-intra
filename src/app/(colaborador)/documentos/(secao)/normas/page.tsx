import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { BookOpen, ChevronRight, Download } from "lucide-react";
import { z } from "zod";
import { SearchField } from "@/components/ui/filters";
import { iconFor } from "@/components/ui/icons";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listPolicies } from "@/server/services/documents";

export const metadata: Metadata = { title: "Normas e manuais" };

export default async function PoliciesPage({ searchParams }: PageProps<"/documentos/normas">) {
  const ctx = await requireCtx();
  const q = z.string().max(100).optional().catch(undefined).parse((await searchParams).q);
  const items = await listPolicies(ctx, { q });
  return (
    <Card className="p-4 sm:p-6" aria-labelledby="normas-titulo">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="normas-titulo" className="text-xl font-bold text-ink">
            Normas e manuais
          </h2>
          <p className="text-[0.9375rem] text-muted">Políticas, regulamentos e manuais vigentes da REALSEG.</p>
        </div>
        <SearchField label="Buscar normas" placeholder="Buscar norma ou manual..." defaultValue={q} className="md:w-72" />
      </div>
      {items.length === 0 ? (
        <EmptyState className="mt-5" icon={BookOpen} title="Nenhum documento encontrado" description="Tente outras palavras." />
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((p) => {
            const Icon = iconFor(p.category.icon);
            return (
              <li key={p.id} className="flex items-start gap-4 rounded-[var(--radius-card)] border border-line p-4">
                <Icon className="mt-1 size-7 shrink-0 text-slate-700" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link href={`/documentos/${p.id}`} className="font-bold text-ink hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-[0.9375rem] text-muted">{p.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                    {p.effectiveFrom && <span>Vigente desde {fmtDate(p.effectiveFrom + "T12:00:00Z")}</span>}
                    {p.requiresAck && (p.acknowledged ? <Badge tone="green">Ciência confirmada</Badge> : <Badge tone="amber">Ciência pendente</Badge>)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-center">
                  <a href={`/api/v1/documents/${p.id}/file?disposition=attachment`} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-canvas" aria-label={`Baixar ${p.title}`}>
                    <Download className="size-5" aria-hidden />
                  </a>
                  <Link href={`/documentos/${p.id}`} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-canvas" aria-label={`Abrir ${p.title}`}>
                    <ChevronRight className="size-5" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
