"use client";

import { useId, useRef, useState } from "react";
import { Camera, CloudUpload, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtFileSize } from "@/lib/format";

const ALLOWED = ["pdf", "jpg", "jpeg", "png"];
export const MAX_UPLOAD_MB = 10;

/** Validação no cliente (o servidor revalida extensão, tamanho e conteúdo real). */
export function checkFile(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED.includes(ext)) return `"${f.name}": formato não aceito. Envie PDF, JPG ou PNG.`;
  if (f.size === 0) return `"${f.name}" está vazio.`;
  if (f.size > MAX_UPLOAD_MB * 1024 * 1024) return `"${f.name}" excede ${MAX_UPLOAD_MB} MB.`;
  return null;
}

export function FileUpload({
  label,
  files,
  onChange,
  max = 1,
  error,
  hint = "PDF, JPG ou PNG, até 10 MB.",
  required,
  allowCamera = true,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  error?: string;
  hint?: string;
  required?: boolean;
  allowCamera?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    setLocalError(null);
    const incoming = Array.from(list);
    for (const f of incoming) {
      const err = checkFile(f);
      if (err) return setLocalError(err);
    }
    const merged = max === 1 ? incoming.slice(0, 1) : [...files, ...incoming];
    if (merged.length > max) return setLocalError(`Envie no máximo ${max} arquivos.`);
    onChange(merged);
  }

  const shownError = localError ?? error;
  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-red-700" aria-hidden>
            *
          </span>
        )}
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "mt-1.5 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed px-4 py-6 text-center transition-colors",
          drag ? "border-brand-600 bg-brand-50" : shownError ? "border-red-700/60 bg-red-50/40" : "border-line-strong bg-canvas",
        )}
      >
        <CloudUpload className="size-9 text-brand-600" aria-hidden />
        <p className="text-[0.9375rem] text-muted">
          <span className="hidden sm:inline">Arraste o arquivo aqui ou </span>escolha uma opção:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-4 text-[0.9375rem] font-semibold text-ink hover:bg-canvas" aria-describedby={`${id}-hint`}>
            <Paperclip className="size-5" aria-hidden /> {max > 1 ? "Selecionar arquivos" : "Selecionar arquivo"}
          </button>
          {allowCamera && (
            <button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-4 text-[0.9375rem] font-semibold text-ink hover:bg-canvas sm:hidden">
              <Camera className="size-5" aria-hidden /> Tirar foto
            </button>
          )}
        </div>
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
          {max > 1 ? ` Até ${max} arquivos.` : ""}
        </p>
        <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} aria-labelledby={`${id}-label`} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple={max > 1} onChange={(e) => { add(e.target.files); e.target.value = ""; }} data-testid="file-input" />
        {allowCamera && <input ref={cameraRef} type="file" className="sr-only" tabIndex={-1} aria-hidden accept="image/jpeg,image/png" capture="environment" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />}
      </div>
      {shownError && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          {shownError}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="Arquivos selecionados">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
              <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-medium text-ink">{f.name}</span>
                <span className="block text-xs text-muted">{fmtFileSize(f.size)}</span>
              </span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label={`Remover ${f.name}`}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
