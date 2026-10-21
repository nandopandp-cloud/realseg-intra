import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Tabela de gestão: rolagem horizontal própria no celular (sem rolar a página), cabeçalho legível
 * e linhas com destaque ao passar o mouse. `caption` é obrigatória para leitores de tela.
 */
export function Table({ caption, children, className }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto sm:mx-0", className)}>
      <table className="w-full min-w-[44rem] border-collapse text-left text-[0.9375rem]">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("border-b border-line px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-line px-4 py-3.5 align-middle text-ink", className)} {...props} />;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-canvas/60", className)}>{children}</tr>;
}
