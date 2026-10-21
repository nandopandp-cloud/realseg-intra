"use client";

import { useId, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";

export type PickedEmployee = { id: string; name: string; registration: string; position?: string; department?: string; unit?: string };

/** Combobox acessível de colaborador: busca por nome ou matrícula (mín. 2 caracteres) enquanto digita. */
export function EmployeePicker({ value, onChange, label = "Colaborador", error, required }: { value: PickedEmployee | null; onChange: (e: PickedEmployee | null) => void; label?: string; error?: string; required?: boolean }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickedEmployee[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctrl = useRef<AbortController | null>(null);

  /** Busca com espera de 250 ms após a última tecla; a requisição anterior é cancelada. */
  function search(next: string) {
    setQ(next);
    if (timer.current) clearTimeout(timer.current);
    ctrl.current?.abort();
    if (next.trim().length < 2) {
      setItems([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const c = new AbortController();
      ctrl.current = c;
      setLoading(true);
      try {
        const r = await api<{ items: PickedEmployee[] }>(`/rh/employees/search?q=${encodeURIComponent(next.trim())}`, { signal: c.signal });
        setItems(r.items);
        setActive(0);
        setOpen(true);
      } catch {
        /* busca interrompida ou falha de rede: mantém a lista anterior */
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function pick(e: PickedEmployee) {
    onChange(e);
    setQ("");
    setItems([]);
    setOpen(false);
  }

  if (value) {
    return (
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-brand-600 bg-brand-50 p-3">
          <Avatar name={value.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{value.name}</p>
            <p className="truncate text-sm text-muted">
              Matrícula {value.registration}
              {value.position ? ` · ${value.position}` : ""}
              {value.unit ? ` · ${value.unit}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-brand-100" aria-label={`Trocar colaborador (${value.name})`}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-red-700" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="relative mt-1.5">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          value={q}
          onChange={(e) => search(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && items[active]) {
              e.preventDefault();
              pick(items[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Digite o nome ou a matrícula"
          autoComplete="off"
          className={cn("min-h-12 w-full rounded-[var(--radius-control)] border bg-surface pr-10 pl-11 text-base text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none", error ? "border-red-700" : "border-line-strong")}
        />
        {loading && <LoaderCircle className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 animate-spin text-muted" aria-hidden />}
      </div>
      {open && q.trim().length >= 2 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-raised)]">
          {items.length === 0 && !loading && <li className="px-3 py-3 text-sm text-muted">Nenhum colaborador encontrado.</li>}
          {items.map((e, i) => (
            <li
              key={e.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(e);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2", i === active && "bg-canvas")}
            >
              <Avatar name={e.name} size="sm" />
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{e.name}</span>
                <span className="block truncate text-sm text-muted">
                  {e.registration} · {e.position} · {e.unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
