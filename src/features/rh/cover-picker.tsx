"use client";

import { useRef, useState } from "react";
import { ImageOff, ImageUp, LoaderCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

/** Imagens públicas já tratadas para capa (WebP). */
export const COVER_LIBRARY = [
  "/images/comunicado-uniforme.webp",
  "/images/thumb-boas-praticas.webp",
  "/images/thumb-cracha.webp",
  "/images/destaque-guard.webp",
  "/images/hero-documentos.webp",
  "/images/course-continue.webp",
  "/images/thumb-nr33.webp",
  "/images/thumb-incendio.webp",
  "/images/thumb-conducao.webp",
  "/images/thumb-equipe.webp",
  "/images/thumb-lideranca.webp",
  "/images/thumb-cultura.webp",
  "/images/thumb-comunicacao.webp",
];

/** Capa: sem imagem (usa a cor da categoria), imagem da biblioteca ou envio de JPG/PNG próprio. */
export function CoverPicker({ value, onChange, label = "Imagem de capa" }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploaded = value && !COVER_LIBRARY.includes(value) ? value : null;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/\.(jpe?g|png)$/i.test(file.name)) return setError("Envie uma imagem JPG ou PNG.");
    if (file.size > 10 * 1024 * 1024) return setError("A imagem deve ter até 10 MB.");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const r = await api<{ url: string }>("/rh/media", { formData: fd });
      onChange(r.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const tile = (active: boolean) => cn("relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition-colors", active ? "border-brand-600 ring-2 ring-brand-200" : "border-transparent hover:border-line-strong");

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <p className="mt-0.5 text-sm text-muted">Opcional. Sem capa, o comunicado usa o ícone e a cor da categoria.</p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
        <li>
          <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={cn(tile(value === null), "flex w-full flex-col items-center justify-center gap-1 bg-canvas text-xs font-medium text-muted")}>
            <ImageOff className="size-5" aria-hidden />
            Sem capa
          </button>
        </li>
        <li>
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className={cn(tile(!!uploaded), "flex w-full flex-col items-center justify-center gap-1 bg-canvas text-xs font-medium text-brand-700")} aria-pressed={!!uploaded}>
            {uploaded ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={uploaded} alt="" className="absolute inset-0 size-full object-cover" />
            ) : busy ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
            ) : (
              <ImageUp className="size-5" aria-hidden />
            )}
            {!uploaded && (busy ? "Enviando…" : "Enviar imagem")}
            <span className="sr-only">{uploaded ? "Imagem enviada selecionada. Clique para trocar." : ""}</span>
          </button>
          <input ref={input} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files?.[0])} aria-label="Enviar imagem de capa" />
        </li>
        {COVER_LIBRARY.map((src) => (
          <li key={src}>
            <button type="button" aria-pressed={value === src} onClick={() => onChange(src)} className={cn(tile(value === src), "w-full")} aria-label={`Usar imagem ${src.split("/").pop()?.replace(".webp", "").replace(/-/g, " ")}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-1.5 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
