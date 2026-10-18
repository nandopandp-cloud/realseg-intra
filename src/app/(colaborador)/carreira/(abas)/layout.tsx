import { PageBody, PageHero } from "@/components/layout/page-hero";
import { CareerTabs } from "@/features/career/career-tabs";

export default function CareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHero
        eyebrow="Carreira"
        title="Minha carreira"
        subtitle="Acompanhe seu desenvolvimento e novas oportunidades na REALSEG."
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Minha carreira" }]}
        image="/images/hero-carreira.webp"
        mobileImage="/images/mhero-carreira.webp"
      >
        <CareerTabs />
      </PageHero>
      <PageBody>{children}</PageBody>
    </>
  );
}
