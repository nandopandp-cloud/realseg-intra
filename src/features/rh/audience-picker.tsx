"use client";

import { useId, useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AudienceValue } from "@/lib/validation/rh";

export type AudienceOptions = {
  departments: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; city?: string; state?: string }>;
  families: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string; level?: string; familyName?: string }>;
};

const GROUPS = [
  { key: "department", label: "Áreas", opt: "departments" },
  { key: "unit", label: "Unidades", opt: "units" },
  { key: "job_family", label: "Famílias", opt: "families" },
  { key: "job_position", label: "Cargos", opt: "positions" },
] as const;

/**
 * Público-alvo: "Todos os colaboradores" ou qualquer combinação de áreas, unidades, famílias e cargos
 * (quem se encaixa em QUALQUER regra recebe). Mesma regra para comunicados, cursos e oportunidades.
 */
export function AudiencePicker({
  value,
  onChange,
  options,
  error,
  allLabel = "Todos os colaboradores",
  legend = "Público-alvo",
  hint = "Quem se encaixar em qualquer item selecionado recebe.",
}: {
  value: AudienceValue;
  onChange: (v: AudienceValue) => void;
  options: AudienceOptions;
  error?: string;
  allLabel?: string;
  legend?: string;
  hint?: string;
}) {
  const id = useId();
  const [tab, setTab] = useState<(typeof GROUPS)[number]["key"]>("department");
  const [q, setQ] = useState("");
  const group = GROUPS.find((g) => g.key === tab)!;
  const list = useMemo(() => {
    const items = options[group.opt] as Array<{ id: string; name: string; level?: string; familyName?: string; city?: string; state?: string }>;
    const term = q.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    if (!term) return items;
    return items.filter((i) => `${i.name} ${i.familyName ?? ""} ${i.city ?? ""}`.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(term));
  }, [options, group.opt, q]);
  const selectedCount = value.department.length + value.unit.length + value.job_family.length + value.job_position.length;

  function toggle(key: (typeof GROUPS)[number]["key"], itemId: string) {
    const set = new Set(value[key]);
    if (set.has(itemId)) set.delete(itemId);
    else set.add(itemId);
    onChange({ ...value, all: false, [key]: [...set] });
  }

  return (
    <fieldset aria-describedby={error ? `${id}-err` : `${id}-hint`}>
      <legend className="text-sm font-semibold text-ink">
        {legend}
        <span className="ml-0.5 text-red-700" aria-hidden>
          *
        </span>
      </legend>
      <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted">
        {hint}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          { all: true, title: allLabel, text: "Todos com acesso à intranet." },
          { all: false, title: "Público específico", text: selectedCount ? `${selectedCount} ${selectedCount === 1 ? "item selecionado" : "itens selecionados"}` : "Escolha áreas, unidades, famílias ou cargos." },
        ].map((o) => (
          <label key={o.title} className={cn("flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border p-3", value.all === o.all ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas")}>
            <input type="radio" name={`${id}-mode`} checked={value.all === o.all} onChange={() => onChange({ ...value, all: o.all })} className="mt-1 size-5 accent-[var(--color-brand-700)]" />
            <span>
              <span className="block font-semibold text-ink">{o.title}</span>
              <span className="block text-sm text-muted">{o.text}</span>
            </span>
          </label>
        ))}
      </div>

      {!value.all && (
        <div className="mt-3 rounded-xl border border-line">
          <div role="tablist" aria-label="Tipo de regra" className="flex overflow-x-auto border-b border-line">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={tab === g.key}
                onClick={() => {
                  setTab(g.key);
                  setQ("");
                }}
                className={cn("relative min-h-11 shrink-0 px-4 text-sm font-medium", tab === g.key ? "text-brand-700" : "text-muted hover:text-ink")}
              >
                {g.label}
                {value[g.key].length > 0 && <span className="ml-1.5 rounded-full bg-brand-700 px-1.5 py-0.5 text-xs font-bold text-white">{value[g.key].length}</span>}
                {tab === g.key && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand-600" aria-hidden />}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="p-3">
            <label className="relative block">
              <span className="sr-only">Filtrar {group.label.toLowerCase()}</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filtrar ${group.label.toLowerCase()}...`} className="h-10 w-full rounded-lg border border-line-strong pr-3 pl-9 text-[0.9375rem] focus:border-brand-600 focus:outline-none" />
            </label>
            <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
              {list.length === 0 && <li className="px-2 py-3 text-sm text-muted">Nada encontrado.</li>}
              {list.map((i) => (
                <li key={i.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-canvas">
                    <input type="checkbox" checked={value[tab].includes(i.id)} onChange={() => toggle(tab, i.id)} className="size-5 shrink-0 accent-[var(--color-brand-700)]" />
                    <span className="min-w-0 text-[0.9375rem] text-ink">
                      {i.name}
                      {(i.familyName || i.city) && <span className="block truncate text-xs text-muted">{i.familyName ? `${i.familyName}${i.level ? ` · ${i.level}` : ""}` : `${i.city}/${i.state}`}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-700">
          <UsersRound className="size-4" aria-hidden /> {error}
        </p>
      )}
    </fieldset>
  );
}
