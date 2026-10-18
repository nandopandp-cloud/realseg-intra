import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CloudUpload, ShieldCheck } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { SubmissionForm } from "@/features/documents/submission-form";
import { SubmissionStatusBadge } from "@/features/tickets/status-badge";
import { fmtDate } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listMySubmissions, submissionCategories } from "@/server/services/documents";

export const metadata: Metadata = { title: "Enviar documento" };

export default async function SubmitDocumentPage() {
  const ctx = await requireCtx();
  const [categories, submissions] = await Promise.all([submissionCategories(), listMySubmissions(ctx, { limit: 10 })]);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-4 sm:p-6" aria-labelledby="enviar-titulo">
        <h2 id="enviar-titulo" className="text-xl font-bold text-ink">
          Enviar documento ao RH
        </h2>
        <p className="mt-1 mb-6 text-[0.9375rem] text-muted">Preencha os dados e anexe o arquivo. Você pode tirar uma foto pelo celular.</p>
        <SubmissionForm categories={categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description }))} />
      </Card>
      <aside className="flex flex-col gap-5">
        <Card className="p-5" aria-labelledby="meus-envios">
          <h2 id="meus-envios" className="text-lg font-bold text-ink">
            Meus envios
          </h2>
          {submissions.length === 0 ? (
            <EmptyState className="mt-3 py-6" icon={CloudUpload} title="Nenhum envio ainda" description="Os documentos que você enviar aparecerão aqui com a situação da análise." />
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {submissions.map((s) => (
                <li key={s.id}>
                  <Link href={`/documentos/envios/${s.id}`} className="flex min-h-14 items-center gap-3 py-3 hover:bg-canvas">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{s.title}</span>
                      <span className="block text-sm text-muted">
                        {s.category.name} • {fmtDate(s.createdAt)}
                      </span>
                    </span>
                    <SubmissionStatusBadge status={s.status} />
                    <ChevronRight className="size-5 shrink-0 text-ink/70" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex gap-3 border-brand-100 bg-brand-50 p-5">
          <ShieldCheck className="size-6 shrink-0 text-brand-600" aria-hidden />
          <p className="text-[0.9375rem] text-muted">
            <span className="block font-semibold text-ink">Envio seguro</span>
            Arquivos ficam em área privada e só o RH autorizado pode acessá-los. Aceitamos PDF, JPG e PNG de até 10 MB.
          </p>
        </Card>
      </aside>
    </div>
  );
}
