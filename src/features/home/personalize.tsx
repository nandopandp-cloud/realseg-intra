"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { AVAILABLE_SHORTCUTS } from "./shortcuts";

export function PersonalizeShortcuts({ current }: { current: string[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function toggle(key: string) {
    setError(null);
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : s.length >= 4 ? s : [...s, key]));
  }

  async function save() {
    if (selected.length === 0) return setError("Escolha pelo menos 1 atalho.");
    setSaving(true);
    try {
      await api("/me/preferences", { method: "PATCH", json: { homeShortcuts: selected } });
      setOpen(false);
      toast("success", "Atalhos atualizados.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelected(current);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[0.9375rem] text-muted hover:text-ink"
      >
        Personalizar
        <Settings className="size-5" aria-hidden />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Personalizar acesso rápido"
        description="Escolha até 4 atalhos para a sua página inicial."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              Salvar atalhos
            </Button>
          </>
        }
      >
        {error && <Alert kind="error" className="mb-4">{error}</Alert>}
        <fieldset>
          <legend className="mb-3 text-sm text-muted">{selected.length} de 4 selecionados</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {AVAILABLE_SHORTCUTS.map((s) => {
              const on = selected.includes(s.key);
              const disabled = !on && selected.length >= 4;
              const Icon = s.icon;
              return (
                <li key={s.key}>
                  <label
                    className={cn(
                      "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                      on ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={on} disabled={disabled} onChange={() => toggle(s.key)} />
                    <Icon className="size-5 text-brand-600" aria-hidden />
                    <span className="flex-1 text-[0.9375rem] font-semibold text-ink">{s.title}</span>
                    <span className={cn("inline-flex size-6 items-center justify-center rounded-md border", on ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong")} aria-hidden>
                      {on && <Check className="size-4" />}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </Dialog>
    </>
  );
}
