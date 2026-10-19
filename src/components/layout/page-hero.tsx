import Image from "next/image";
import Link from "@/components/ui/app-link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/ui/primitives";

/** `share`: fração da largura do cabeçalho ocupada pela imagem na referência (ex.: 0.42 = 42%). */
export type HeroArt = { src: string; width: number; height: number; share: number };
/** Celular: `coverChildren` = a imagem também fica atrás do conteúdo extra (ex.: busca de Cursos); senão termina no subtítulo. */
type MobileArt = HeroArt & { coverChildren?: boolean };

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
  art,
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
  /**
   * Imagem recortada da própria referência (já com o esfumado). É exibida na proporção original,
   * ancorada à direita e com a altura do cabeçalho, sem degradê nem linha extras.
   */
  art?: { desktop: HeroArt; mobile: MobileArt };
}) {
  const mobileArt = art && (
    <div className="pointer-events-none absolute -top-5 -right-4 -bottom-4 sm:-right-6 lg:hidden" style={{ aspectRatio: `${art.mobile.width} / ${art.mobile.height}`, maxWidth: "72%", minWidth: `${art.mobile.share * 100}%` }} aria-hidden>
      <Image src={art.mobile.src} alt="" fill priority sizes="80vw" className="object-cover object-right" />
      <div className="absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-surface to-transparent" />
    </div>
  );
  return (
    <section className="relative overflow-hidden border-b border-line/60 bg-gradient-to-b from-canvas to-surface lg:border-b-0 lg:bg-none" aria-labelledby="page-title">
      {art && (
        <>
          <div className="pointer-events-none absolute top-0 right-0 hidden h-full lg:block" style={{ width: `${art.desktop.share * 100}%` }} aria-hidden>
            <Image src={art.desktop.src} alt="" fill priority sizes="64vw" className="object-cover object-right" />
            <div className="absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-surface to-transparent" />
          </div>
        </>
      )}
      {!art && (image || mobileImage) && (
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
      {/* Com `art`, espaçamentos e tamanhos seguem as referências (cabeçalho mais compacto, imagem na proporção certa). */}
      <div className={cn("relative px-4 sm:px-6 lg:px-10", art ? cn("pt-5 lg:pt-6", children ? "pb-4 lg:pb-4" : "pb-5 lg:pb-7") : "pt-6 pb-6 lg:pt-8 lg:pb-7")}>
        {breadcrumb && <Breadcrumbs items={breadcrumb} />}
        {/* Celular: a imagem acompanha o bloco do título (ou também o conteúdo extra, com `coverChildren`). */}
        <div className="relative">
          {art?.mobile.coverChildren && mobileArt}
          <div className="relative">
            {art && !art.mobile.coverChildren && mobileArt}
            <div className={cn("relative", back && "pl-9 lg:pl-0")}>
              {back && (
                <Link href={back.href} className="absolute top-1/2 -left-2.5 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:bg-canvas lg:hidden" aria-label={back.label}>
                  <ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden />
                </Link>
              )}
              <p className="eyebrow lg:hidden">{eyebrow}</p>
            </div>
            <div className="relative flex items-start justify-between gap-4">
              <div className={cn(art ? "max-w-[60%] lg:max-w-[64%]" : mobileImage ? "max-w-[62%] lg:max-w-[56%]" : "max-w-none lg:max-w-[56%]", back && "pl-9 lg:pl-0")}>
                <h1
                  id="page-title"
                  className={cn("leading-[1.1] font-bold tracking-tight text-ink lg:text-[2.75rem]", art ? "mt-1.5 text-[1.75rem] sm:text-[2.25rem] lg:mt-2" : "mt-2 text-[2rem] sm:text-[2.5rem] lg:mt-3")}
                >
                  {title}
                </h1>
                {subtitle && <p className={cn("leading-snug text-muted lg:text-[1.1875rem]", art ? "mt-1.5 text-[0.9375rem] sm:text-[1.0625rem] lg:mt-2" : "mt-2 text-[1.0625rem] lg:mt-3")}>{subtitle}</p>}
              </div>
              {actions && <div className="relative z-10 hidden shrink-0 lg:block">{actions}</div>}
            </div>
          </div>
          {children && <div className={cn("relative", art ? "mt-4 lg:mt-5" : "mt-5 lg:mt-6")}>{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** Contêiner padrão de conteúdo. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 pt-5 sm:px-6 lg:px-10 lg:pt-2", className)}>{children}</div>;
}
