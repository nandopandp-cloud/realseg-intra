import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Link padrão da aplicação com prefetch automático DESLIGADO (docs/COST_OPTIMIZATION.md §1).
 * Todas as páginas são dinâmicas e dependem da sessão: no Next 16 cada link visível com `loading.tsx`
 * dispararia uma requisição ao servidor (função + consultas ao banco) sem o usuário clicar.
 * A navegação continua rápida: o `loading.tsx` aparece imediatamente ao clicar.
 * Para um link crítico, passe `prefetch` explicitamente.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
