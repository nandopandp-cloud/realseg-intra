"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/form";
import { cn } from "@/lib/cn";

const KEYS = ["aba", "categoria", "periodo"] as const;

/** Filtros de solicitações (situação, categoria e período de abertura) aplicados via URL — sobrevivem ao recarregar. */
export function TicketFilters({ categories, className, compact }: { categories: Array<{ slug: string; name: string }>; className?: string; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = KEYS.filter((k) => params.get(k) && !(k === "aba" && params.get(k) === "rascunhos")).length;

  function go(next: URLSearchParams) {
    next.delete("page");
    setOpen(false);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        icon={<Funnel className="size-4" aria-hidden />}
        className={cn("h-11 min-h-11 rounded-xl", className)}
        aria-label={compact ? `Filtros${active ? ` (${active} ativos)` : ""}` : undefined}
      >
        {compact ? null : "Filtros"}
        {active > 0 && <span className="rounded-full bg-brand-700 px-1.5 text-xs text-white">{active}</span>}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filtrar solicitações" variant="sheet">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const next = new URLSearchParams(params.toString());
            for (const k of KEYS) {
              const v = String(data.get(k) ?? "");
              if (v && !(k === "aba" && v === "todos")) next.set(k, v);
              else next.delete(k);
            }
            go(next);
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Situação">
            {({ id }) => (
              <Select id={id} name="aba" defaultValue={params.get("aba") === "rascunhos" ? "todos" : (params.get("aba") ?? "todos")}>
                <option value="todos">Todas</option>
                <option value="andamento">Em andamento</option>
                <option value="aguardando">Aguardando você</option>
                <option value="respondidos">Respondidas</option>
                <option value="concluidos">Concluídas</option>
              </Select>
            )}
          </Field>
          <Field label="Categoria">
            {({ id }) => (
              <Select id={id} name="categoria" defaultValue={params.get("categoria") ?? ""}>
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Período de abertura">
            {({ id }) => (
              <Select id={id} name="periodo" defaultValue={params.get("periodo") ?? ""}>
                <option value="">Qualquer data</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
              </Select>
            )}
          </Field>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                KEYS.forEach((k) => next.delete(k));
                go(next);
              }}
            >
              Limpar filtros
            </Button>
            <Button type="submit">Aplicar filtros</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
