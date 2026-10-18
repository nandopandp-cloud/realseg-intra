import type { Metadata } from "next";
import Link from "@/components/ui/app-link";
import { Award, ChevronRight } from "lucide-react";
import { PageBody, PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { fmtDate, fmtMinutes } from "@/lib/format";
import { requireCtx } from "@/server/auth/current";
import { listMyCertificates } from "@/server/services/courses";

export const metadata: Metadata = { title: "Meus certificados" };

export default async function CertificatesPage() {
  const ctx = await requireCtx();
  const certs = await listMyCertificates(ctx);
  return (
    <>
      <PageHero eyebrow="Cursos" title="Meus certificados" subtitle="Certificados emitidos ao concluir cursos que possuem regra de certificação." breadcrumb={[{ label: "Início", href: "/" }, { label: "Cursos", href: "/cursos" }, { label: "Certificados" }]} />
      <PageBody>
        {certs.length === 0 ? (
          <EmptyState icon={Award} title="Você ainda não tem certificados" description="Conclua um curso com certificação para recebê-lo aqui." action={<ButtonLink href="/cursos">Explorar cursos</ButtonLink>} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {certs.map((c) => (
              <li key={c.id}>
                <Card className="p-0" as="div">
                  <Link href={`/cursos/certificados/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-canvas">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600" aria-hidden>
                      <Award className="size-6" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold text-ink">{c.courseTitle}</span>
                      <span className="block text-sm text-muted">
                        Emitido em {fmtDate(c.issuedAt)} • {fmtMinutes(c.durationMinutes)} • Código {c.code}
                      </span>
                    </span>
                    <ChevronRight className="size-5 text-ink/70" aria-hidden />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
