"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** Atualiza um parâmetro da URL (filtros persistem ao recarregar e ao compartilhar o link). */
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (entries: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(entries)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { set, pending, params };
}

export function FilterSelect({ name, label, options, className }: { name: string; label: string; options: Array<{ value: string; label: string }>; className?: string }) {
  const { set, params } = useSetParam();
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={params.get(name) ?? ""}
        onChange={(e) => set({ [name]: e.target.value || undefined })}
        className="h-11 w-full appearance-none rounded-xl border border-line-strong bg-surface pr-9 pl-3.5 text-[0.9375rem] font-medium text-ink focus:border-brand-600 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

/** Campo de busca que envia ao pressionar Enter (form GET, funciona sem JS). */
export function SearchField({ name = "q", label, placeholder, defaultValue, hidden, className, size = "md" }: { name?: string; label: string; placeholder: string; defaultValue?: string; hidden?: Record<string, string | undefined>; className?: string; size?: "md" | "lg"; children?: ReactNode }) {
  return (
    <form role="search" method="get" className={cn("relative", className)}>
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="sr-only" htmlFor={`busca-${name}-${label}`}>
        {label}
      </label>
      <Search className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "left-4 size-5" : "left-3.5 size-[1.125rem]")} aria-hidden />
      <input
        id={`busca-${name}-${label}`}
        name={name}
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={100}
        className={cn(
          "w-full rounded-xl border border-line-strong bg-surface text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none",
          size === "lg" ? "h-14 pr-4 pl-12 text-base shadow-[var(--shadow-card)]" : "h-11 pr-3 pl-10 text-[0.9375rem]",
        )}
      />
    </form>
  );
}
