import { File, FileImage, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Ícone por tipo REAL do arquivo (PDF vermelho, imagem azul), como nas referências.
 * `variant="manual"` identifica normas/manuais institucionais (documento azul) e `"notice"` avisos (documento verde),
 * como nas referências de Documentos — independentemente do formato.
 */
export function FileIcon({ mimeType, className, variant = "file" }: { mimeType: string; className?: string; variant?: "file" | "manual" | "notice" }) {
  if (variant === "manual" || variant === "notice") {
    const [body, fold] = variant === "manual" ? ["#2F6FE4", "#9CBDF5"] : ["#0E9F6E", "#8BD9BC"];
    return (
      <span className={cn("relative inline-flex h-11 w-9 shrink-0 items-center justify-center", className)} aria-hidden>
        <svg viewBox="0 0 36 44" className="absolute inset-0 h-full w-full">
          <path d="M4 0h20l12 12v28a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={body} />
          <path d="M24 0l12 12h-8a4 4 0 0 1-4-4V0z" fill={fold} />
          <path d="M9 22h18M9 28h18M9 34h12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <span className={cn("relative inline-flex h-11 w-9 shrink-0 items-center justify-center", className)} aria-hidden>
        <svg viewBox="0 0 36 44" className="absolute inset-0 h-full w-full">
          <path d="M4 0h20l12 12v28a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#E5484D" />
          <path d="M24 0l12 12h-8a4 4 0 0 1-4-4V0z" fill="#F7A6A8" />
        </svg>
        <span className="relative mt-3 text-[0.625rem] font-extrabold tracking-wide text-white">PDF</span>
      </span>
    );
  }
  const Icon = mimeType.startsWith("image/") ? FileImage : mimeType ? FileText : File;
  return (
    <span className={cn("inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white", className)} aria-hidden>
      <Icon className="size-5" />
    </span>
  );
}

/** Variante do ícone de documento pessoal pela categoria (referências: holerite/feedback em PDF, comprovantes e administrativos em azul, avisos em verde). */
export function docIconVariant(categorySlug: string): "file" | "manual" | "notice" {
  if (categorySlug === "comunicado-individual") return "notice";
  if (categorySlug === "comprovante-rendimentos" || categorySlug === "administrativo") return "manual";
  return "file";
}
