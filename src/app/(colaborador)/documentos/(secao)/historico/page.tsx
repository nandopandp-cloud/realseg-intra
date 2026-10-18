import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock, Download, Eye, FileDown, Send, RefreshCw } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { documentHistory, type HistoryEntry } from "@/server/services/documents";

export const metadata: Metadata = { title: "Histórico de documentos" };

const ICON: Record<HistoryEntry["kind"], typeof Clock> = { recebido: FileDown, enviado: Send, status: RefreshCw, ciencia: CircleCheck, download: Download, visualizacao: Eye };

export default async function HistoryPage() {
  const ctx = await requireCtx();
  const entries = await documentHistory(ctx, 60);
  return (
    <Card className="p-4 sm:p-6" aria-labelledby="historico-titulo">
      <h2 id="historico-titulo" className="text-xl font-bold text-ink">
        Histórico
      </h2>
      <p className="text-[0.9375rem] text-muted">Documentos recebidos, enviados, confirmações de ciência e acessos.</p>
      {entries.length === 0 ? (
        <EmptyState className="mt-5" icon={Clock} title="Sem movimentações ainda" description="Quando você receber ou enviar documentos, o histórico aparecerá aqui." />
      ) : (
        <ol className="mt-5 flex flex-col">
          {entries.map((e, i) => {
            const Icon = ICON[e.kind];
            return (
              <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {i < entries.length - 1 && <span className="absolute top-11 left-[1.375rem] h-[calc(100%-2.75rem)] w-px bg-line" aria-hidden />}
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 pt-1">
                  {e.href ? (
                    <Link href={e.href} className="font-semibold text-ink hover:underline">
                      {e.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-ink">{e.title}</p>
                  )}
                  <p className="text-[0.9375rem] text-muted">{e.detail}</p>
                  <p className="text-sm text-muted">{fmtDateTime(e.at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
