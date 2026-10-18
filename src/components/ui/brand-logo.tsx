import { cn } from "@/lib/cn";

/**
 * Logo oficial REALSEG = símbolo + wordmark "REALSEG" (arquivos em public/logo).
 * - Símbolo: SVG oficial (vetorial) recolorido nas cores oficiais (#1CC4A8 fundo escuro, #009488 fundo claro).
 * - Wordmark: PNG oficial em 2x (nítido em telas retina no tamanho exibido).
 * Proporções preservadas; nada é redesenhado.
 */
export function BrandLogo({
  variant,
  size = "md",
  symbolOnly,
  className,
}: {
  /** "dark" = sobre fundo escuro (sidebar/login); "light" = sobre fundo claro (cabeçalho mobile, certificado). */
  variant: "dark" | "light";
  size?: "sm" | "md" | "lg";
  symbolOnly?: boolean;
  className?: string;
}) {
  // Altura do símbolo (px) e largura do wordmark (px) por tamanho — wordmark original 229×29.
  const dims = { sm: { h: 36, w: 104 }, md: { h: 46, w: 128 }, lg: { h: 56, w: 160 } }[size];
  const symbolSrc = variant === "dark" ? "/logo/symbol-on-dark.svg" : "/logo/symbol-on-light.svg";
  const wordSrc = variant === "dark" ? "/logo/wordmark-white.png" : "/logo/wordmark-midnight.png";
  return (
    <span role="img" aria-label="REALSEG" className={cn("inline-flex shrink-0 items-center", className)} style={{ gap: Math.round(dims.h * 0.28) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG/PNG estáticos da marca, sem otimização para preservar nitidez e transparência */}
      <img src={symbolSrc} alt="" aria-hidden width={Math.round((dims.h * 1160) / 880)} height={dims.h} className="block h-auto" style={{ width: Math.round((dims.h * 1160) / 880) }} />
      {!symbolOnly && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wordSrc} alt="" aria-hidden width={dims.w} height={Math.round((dims.w * 29) / 229)} className="block h-auto" style={{ width: dims.w }} />
      )}
    </span>
  );
}
