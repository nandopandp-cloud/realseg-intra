import { File, FileImage, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

/** Ícone por tipo REAL do arquivo (PDF vermelho, imagem azul), como nas referências. */
export function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
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
