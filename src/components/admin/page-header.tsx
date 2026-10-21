import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/primitives";

/** Cabeçalho padrão das telas de gestão: trilha, título, descrição e ações à direita (abaixo no celular). */
export function AdminPageHeader({
  title,
  description,
  crumbs = [],
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  crumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <Breadcrumbs items={[{ label: "Gestão", href: "/rh" }, ...crumbs, { label: title }]} />
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.125rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-[0.9375rem] text-muted sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Contêiner de página da gestão (mesmos gutters da área do colaborador). */
export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-7">{children}</div>;
}
