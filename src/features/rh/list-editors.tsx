"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { HIGHLIGHT_ICONS } from "@/lib/validation/rh";

const ICON_LABEL: Record<(typeof HIGHLIGHT_ICONS)[number], string> = {
  check: "Confirmação",
  shield: "Segurança",
  clock: "Horário",
  calendar: "Data",
  alert: "Atenção",
  shirt: "Uniforme",
  badge: "Crachá",
  boot: "Calçado de segurança",
};

export type Highlight = { icon: (typeof HIGHLIGHT_ICONS)[number]; title: string; text: string };

/** Itens da seção "O que muda" (até 6), na ordem em que aparecem para o colaborador. */
export function HighlightsEditor({ value, onChange, error }: { value: Highlight[]; onChange: (v: Highlight[]) => void; error?: string }) {
  const set = (i: number, patch: Partial<Highlight>) => onChange(value.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">“O que muda”</legend>
      <p className="mt-0.5 text-sm text-muted">Opcional. Até 6 pontos-chave exibidos em destaque no topo do comunicado.</p>
      <ol className="mt-3 flex flex-col gap-3">
        {value.map((h, i) => (
          <li key={i} className="rounded-xl border border-line p-3">
            <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
              <Select aria-label={`Ícone do item ${i + 1}`} value={h.icon} onChange={(e) => set(i, { icon: e.target.value as Highlight["icon"] })}>
                {HIGHLIGHT_ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ICON_LABEL[ic]}
                  </option>
                ))}
              </Select>
              <Input aria-label={`Título do item ${i + 1}`} placeholder="Título (ex.: Crachá visível)" value={h.title} maxLength={60} onChange={(e) => set(i, { title: e.target.value })} />
            </div>
            <div className="mt-2 flex items-start gap-2">
              <Input aria-label={`Descrição do item ${i + 1}`} placeholder="Descrição curta" value={h.text} maxLength={200} onChange={(e) => set(i, { text: e.target.value })} className="flex-1" />
              <IconButton label={`Subir item ${i + 1}`} variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" aria-hidden /></IconButton>
              <IconButton label={`Descer item ${i + 1}`} variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" aria-hidden /></IconButton>
              <IconButton label={`Remover item ${i + 1}`} variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="size-4 text-red-700" aria-hidden /></IconButton>
            </div>
          </li>
        ))}
      </ol>
      {value.length < 6 && (
        <Button type="button" variant="outline" size="sm" className="mt-3" icon={<Plus className="size-4" aria-hidden />} onClick={() => onChange([...value, { icon: "check", title: "", text: "" }])}>
          Adicionar item
        </Button>
      )}
      {error && <p className="mt-1.5 text-sm font-medium text-red-700">{error}</p>}
    </fieldset>
  );
}

/** Tags livres (Enter ou vírgula adiciona). Usadas para filtrar e sugerir relacionados. */
export function TagsInput({ value, onChange, label = "Tags", hint = "Opcional. Pressione Enter ou vírgula para adicionar. Ex.: uniforme, segurança." }: { value: string[]; onChange: (v: string[]) => void; label?: string; hint?: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim().replace(/,$/, "").toLowerCase();
    if (t.length >= 2 && !value.includes(t) && value.length < 10) onChange([...value, t.slice(0, 30)]);
    setDraft("");
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }
  return (
    <div>
      <label htmlFor="tags-input" className="text-sm font-semibold text-ink">
        {label}
      </label>
      <p className="text-sm text-muted">{hint}</p>
      <div className="mt-1.5 flex min-h-12 flex-wrap items-center gap-1.5 rounded-[var(--radius-control)] border border-line-strong px-2 py-1.5 focus-within:border-brand-600">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-medium text-brand-700">
            #{t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="-mr-1 rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remover tag ${t}`}>
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input id="tags-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} maxLength={30} className="min-w-32 flex-1 bg-transparent px-1 text-base outline-none" placeholder={value.length ? "" : "Adicionar tag"} />
      </div>
    </div>
  );
}
