import Image from "next/image";
import Link from "@/components/ui/app-link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/ui/primitives";

/**
 * Cabeçalho de página das referências: título grande à esquerda e fotografia decorativa à direita
 * esmaecendo para o branco. No celular, rótulo superior (eyebrow) + título + imagem lateral.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  image,
  mobileImage,
  imageClassName,
  children,
  actions,
  overlay,
  back,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  image?: string;
  mobileImage?: string;
  imageClassName?: string;
  children?: ReactNode;
  actions?: ReactNode;
  overlay?: ReactNode;
  /** Celular: seta "voltar" à esquerda do rótulo, com o título recuado (referências de Documentos e Solicitações). */
  back?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden border-b border-line/60 bg-gradient-to-b from-canvas to-surface lg:border-b-0 lg:bg-none" aria-labelledby="page-title">
      {(image || mobileImage) && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] sm:w-[46%] lg:w-[48%] xl:w-[44%]" aria-hidden>
          {mobileImage && <Image src={mobileImage} alt="" fill priority sizes="50vw" className={cn("object-cover object-right lg:hidden", imageClassName)} />}
          {image && <Image src={image} alt="" fill priority sizes="45vw" className={cn("hidden object-cover object-right lg:block", imageClassName)} />}
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent lg:via-surface/10" />
          <svg className="absolute inset-0 hidden h-full w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            <line x1="8" y1="100" x2="46" y2="0" stroke="var(--color-brand-400)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
          </svg>
          {overlay}
        </div>
      )}
      <div className="relative px-4 pt-6 pb-6 sm:px-6 lg:px-10 lg:pt-8 lg:pb-7">
        {breadcrumb && <Breadcrumbs items={breadcrumb} />}
        <div className={cn(back && "relative pl-9 lg:pl-0")}>
        {back && (
          <Link href={back.href} className="absolute top-1/2 -left-2.5 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:bg-canvas lg:hidden" aria-label={back.label}>
            <ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden />
          </Link>
        )}
        <p className="eyebrow lg:hidden">{eyebrow}</p>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className={cn(mobileImage ? "max-w-[62%]" : "max-w-none", back && "pl-9 lg:pl-0", "lg:max-w-[56%]")}>
            <h1 id="page-title" className="mt-2 text-[2rem] leading-[1.1] font-bold tracking-tight text-ink sm:text-[2.5rem] lg:mt-3 lg:text-[2.75rem]">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-[1.0625rem] leading-snug text-muted lg:mt-3 lg:text-[1.1875rem]">{subtitle}</p>}
          </div>
          {actions && <div className="relative z-10 hidden shrink-0 lg:block">{actions}</div>}
        </div>
        {children && <div className="relative mt-5 lg:mt-6">{children}</div>}
      </div>
    </section>
  );
}

/** Contêiner padrão de conteúdo. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 pt-5 sm:px-6 lg:px-10 lg:pt-2", className)}>{children}</div>;
}
