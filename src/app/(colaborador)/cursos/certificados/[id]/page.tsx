import type { Metadata } from "next";
import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "@/components/ui/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/features/courses/print-button";
import { fmtDateLong, fmtMinutes } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { isUuid, orNotFound } from "@/server/http/page";
import { getMyCertificate } from "@/server/services/courses";

export const metadata: Metadata = { title: "Certificado" };

export default async function CertificatePage({ params }: PageProps<"/cursos/certificados/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const c = await orNotFound(getMyCertificate(ctx, id));
  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/cursos/certificados" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-brand-600">
          <ArrowLeft className="size-4" aria-hidden /> Meus certificados
        </Link>
        <PrintButton />
      </div>
      <section aria-label="Certificado" className="mx-auto mt-5 max-w-4xl rounded-[var(--radius-card)] border-4 border-double border-brand-200 bg-surface p-6 text-center sm:p-14 print:mt-0 print:border-brand-600">
        <div className="flex justify-center">
          <BrandLogo variant="light" size="lg" />
        </div>
        <p className="eyebrow mt-8">Certificado de conclusão</p>
        <p className="mt-6 text-lg text-muted">Certificamos que</p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">{c.holderName}</h1>
        <p className="mt-4 text-lg text-muted">concluiu o curso</p>
        <p className="mt-2 text-2xl font-bold text-brand-700">{c.courseTitle}</p>
        <p className="mt-4 text-muted">
          com carga horária de {fmtMinutes(c.durationMinutes)}, em {fmtDateLong(c.issuedAt)}.
        </p>
        <p className="mt-10 font-mono text-sm text-muted">Código de verificação: {c.code}</p>
      </section>
    </div>
  );
}
