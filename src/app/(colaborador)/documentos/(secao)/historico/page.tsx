import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { ChevronRight, CircleCheck, Clock, Download, Eye, FileDown, Send, RefreshCw } from "lucide-react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { ButtonLink } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/navigation";
import { Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { documentHistory, type HistoryEntry } from "@/server/services/documents";

export const metadata: Metadata = { title: "Histórico de documentos" };

const ICON: Record<HistoryEntry["kind"], typeof Clock> = { recebido: FileDown, enviado: Send, status: RefreshCw, ciencia: CircleCheck, download: Download, visualizacao: Eye };
const TONE: Record<HistoryEntry["kind"], string> = {
  recebido: "bg-brand-50 text-brand-600",
  enviado: "bg-blue-50 text-blue-600",
  status: "bg-amber-50 text-amber-700",
  ciencia: "bg-emerald-50 text-emerald-700",
  download: "bg-slate-100 text-slate-700",
  visualizacao: "bg-slate-100 text-slate-700",
};

/** Filtros do histórico (cada um é uma URL). */
const FILTERS = {
  todos: { label: "Todos", kinds: null },
  recebidos: { label: "Recebidos", kinds: ["recebido"] },
  enviados: { label: "Enviados ao RH", kinds: ["enviado", "status"] },
  ciencia: { label: "Ciência", kinds: ["ciencia"] },
  acessos: { label: "Acessos", kinds: ["download", "visualizacao"] },
} as const satisfies Record<string, { label: string; kinds: readonly HistoryEntry["kind"][] | null }>;
type FilterKey = keyof typeof FILTERS;

const params = z.object({ tipo: z.enum(Object.keys(FILTERS) as [FilterKey, ...FilterKey[]]).catch("todos") });
const monthLabel = (d: Date) => {
  const s = format(new TZDate(d, "America/Sao_Paulo"), "MMMM 'de' yyyy", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default async function HistoryPage({ searchParams }: PageProps<"/documentos/historico">) {
  const ctx = await requireCtx();
  const { tipo } = params.parse(await searchParams);
  const all = await documentHistory(ctx, 120);
  const kinds = FILTERS[tipo].kinds as readonly HistoryEntry["kind"][] | null;
  const entries = kinds ? all.filter((e) => kinds.includes(e.kind)) : all;
  const counts = Object.fromEntries(Object.entries(FILTERS).map(([k, f]) => [k, f.kinds ? all.filter((e) => (f.kinds as readonly string[]).includes(e.kind)).length : all.length]));

  // Agrupa por mês, na ordem (mais recente primeiro).
  const groups: Array<{ month: string; items: HistoryEntry[] }> = [];
  for (const e of entries) {
    const m = monthLabel(e.at);
    if (groups.at(-1)?.month !== m) groups.push({ month: m, items: [] });
    groups.at(-1)!.items.push(e);
  }

  return (
    <Card className="max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none md:p-6" aria-labelledby="historico-titulo">
      <h2 id="historico-titulo" className="text-xl font-bold text-ink">
        Histórico
      </h2>
      <p className="text-[0.9375rem] text-muted">Documentos recebidos, enviados, confirmações de ciência e acessos.</p>
      <LinkTabs
        label="Filtrar histórico"
        className="mt-4"
        items={(Object.keys(FILTERS) as FilterKey[]).map((k) => ({ href: k === "todos" ? "/documentos/historico" : `/documentos/historico?tipo=${k}`, label: FILTERS[k].label, count: counts[k], active: k === tipo }))}
      />
      {entries.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={Clock}
          title={tipo === "todos" ? "Sem movimentações ainda" : "Nada por aqui neste filtro"}
          description={tipo === "todos" ? "Quando você receber ou enviar documentos, o histórico aparecerá aqui." : "Escolha outro filtro para ver as demais movimentações."}
          action={tipo === "todos" ? undefined : <ButtonLink href="/documentos/historico" variant="outline">Ver tudo</ButtonLink>}
        />
      ) : (
        groups.map((g) => (
          <section key={g.month} aria-label={g.month} className="mt-6">
            <h3 className="text-sm font-bold tracking-wide text-muted uppercase">{g.month}</h3>
            <ol className="mt-2 flex flex-col">
              {g.items.map((e, i) => {
                const Icon = ICON[e.kind];
                const body = (
                  <>
                    <span className={cn("relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full", TONE[e.kind])} aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className="block font-semibold text-ink group-hover:underline">{e.title}</span>
                      <span className="block text-[0.9375rem] text-muted">{e.detail}</span>
                      <span className="block text-sm text-muted">{fmtDateTime(e.at)}</span>
                    </span>
                    {e.href && <ChevronRight className="mt-3 size-5 shrink-0 text-ink/60" aria-hidden />}
                  </>
                );
                return (
                  <li key={`${e.kind}-${e.at.toISOString()}-${i}`} className="relative">
                    {i < g.items.length - 1 && <span className="absolute top-12 bottom-0 left-[1.375rem] w-px bg-line" aria-hidden />}
                    {e.href ? (
                      <Link href={e.href} className="group flex gap-4 rounded-xl py-2 pr-1 hover:bg-canvas">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex gap-4 py-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </Card>
  );
}
