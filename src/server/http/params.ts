import { notFound } from "../errors";

/** Protocolo numérico de ticket ("1048" ou "#1048"). Inválido => 404. */
export function parseTicketNumber(value: string | undefined): number {
  const v = (value ?? "").replace(/^%23|^#/, "");
  if (!/^\d{1,9}$/.test(v)) throw notFound("Solicitação");
  return Number(v);
}

export function parseSlug(value: string | undefined, what = "Registro"): string {
  if (!value || !/^[a-z0-9-]{1,120}$/.test(value)) throw notFound(what);
  return value;
}
