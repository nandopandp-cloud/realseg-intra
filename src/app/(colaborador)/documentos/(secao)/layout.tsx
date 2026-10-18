import { PageBody, PageHero } from "@/components/layout/page-hero";
import { DocumentsNav } from "@/features/documents/doc-nav";

export default function DocumentsSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHero
        eyebrow="Documentos"
        title="Meus documentos"
        subtitle="Consulte, baixe e envie documentos de forma segura e organizada."
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Documentos" }]}
        image="/images/hero-documentos.jpg"
      />
      <PageBody>
        <DocumentsNav />
        <div className="mt-6">{children}</div>
      </PageBody>
    </>
  );
}
