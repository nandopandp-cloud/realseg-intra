"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/form";

/** Filtros de documentos (categoria, ano, situação) aplicados via URL. */
export function DocumentFilters({ categories, years }: { categories: Array<{ slug: string; name: string }>; years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = ["categoria", "ano", "status"].filter((k) => params.get(k)).length;

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const next = new URLSearchParams(params.toString());
    for (const k of ["categoria", "ano", "status"]) {
      const v = String(data.get(k) ?? "");
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    setOpen(false);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} icon={<Funnel className="size-4" aria-hidden />} className="h-11 min-h-11 rounded-xl">
        Filtros{active > 0 && <span className="rounded-full bg-brand-700 px-1.5 text-xs text-white">{active}</span>}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filtrar documentos" variant="sheet">
        <form
          id="doc-filters"
          onSubmit={(e) => {
            e.preventDefault();
            apply(e.currentTarget);
          }}
          className="flex flex-col gap-4"
        >
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
          <Field label="Ano de recebimento">
            {({ id }) => (
              <Select id={id} name="ano" defaultValue={params.get("ano") ?? ""}>
                <option value="">Todos</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Situação">
            {({ id }) => (
              <Select id={id} name="status" defaultValue={params.get("status") ?? ""}>
                <option value="">Todas</option>
                <option value="pendente">Aguardando minha ciência</option>
                <option value="ciente">Ciência confirmada</option>
              </Select>
            )}
          </Field>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                const next = new URLSearchParams(params.toString());
                ["categoria", "ano", "status", "page"].forEach((k) => next.delete(k));
                router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
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
