/**
 * Áreas que existem no código mas estão ocultas no produto. Desligada, a área some da navegação,
 * dos atalhos e dos links, e a rota responde 404. Para reativar, basta trocar para `true`.
 */
export const FEATURES = {
  /** "Fale com o RH" (oculto em 2026-10-18 a pedido do produto; os pedidos ao RH seguem por Solicitações → RH). */
  talkToHr: false,
} as const;
