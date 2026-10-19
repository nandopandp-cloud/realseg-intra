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
        art={{ desktop: { src: "/images/hero-carreira-ref.webp", width: 670, height: 203, share: 0.535 }, mobile: { src: "/images/mhero-carreira-ref.webp", width: 354, height: 240, share: 0.42 } }}
      >
        <CareerTabs />
      </PageHero>
      <PageBody>{children}</PageBody>
    </>
  );
}
