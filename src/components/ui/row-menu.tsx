"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";

/** Menu de ações por linha (⋮). Esc/clique fora fecham; itens são links reais. */
export function RowMenu({ label, items }: { label: string; items: Array<{ label: string; href: string; external?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button ref={btn} type="button" aria-expanded={open} aria-controls={id} aria-label={label} onClick={() => setOpen(!open)} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink">
        <EllipsisVertical className="size-5" aria-hidden />
      </button>
      <ul id={id} hidden={!open} className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-raised)]">
        {items.map((it) => (
          <li key={it.href + it.label}>
            {it.external ? (
              <a href={it.href} target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] text-ink hover:bg-canvas" onClick={() => setOpen(false)}>
                {it.label}
              </a>
            ) : (
              <Link href={it.href} className="flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] text-ink hover:bg-canvas" onClick={() => setOpen(false)}>
                {it.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
