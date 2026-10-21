/**
 * Monta um link preservando os filtros atuais da URL. Valores vazios e os iguais ao padrão são omitidos
 * (URLs curtas e compartilháveis); trocar qualquer filtro volta para a página 1.
 */
export function listHref(
  path: string,
  current: Record<string, string | number | undefined>,
  patch: Record<string, string | number | undefined> = {},
  defaults: Record<string, string | number> = {},
): string {
  const merged = { ...current, ...(Object.keys(patch).some((k) => k !== "page") ? { page: undefined } : {}), ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || String(v) === String(defaults[k] ?? (k === "page" ? 1 : ""))) continue;
    p.set(k, String(v));
  }
  return `${path}${p.size ? `?${p}` : ""}`;
}
