import { TZDate } from "@date-fns/tz";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Fuso de exibição padrão (a maioria das unidades). Datas são armazenadas em UTC. */
export const DISPLAY_TZ = "America/Sao_Paulo";

const z = (d: Date | string) => new TZDate(typeof d === "string" ? new Date(d) : d, DISPLAY_TZ);

/** "08 de out. de 2026" (padrão das referências) */
export const fmtDateLong = (d: Date | string) => format(z(d), "dd 'de' MMM'.' 'de' yyyy", { locale: ptBR });
/** "08/10/2026" */
export const fmtDate = (d: Date | string) => format(z(d), "dd/MM/yyyy");
/** "08/10/2026 às 14:30" */
export const fmtDateTime = (d: Date | string) => format(z(d), "dd/MM/yyyy 'às' HH:mm");
/** "08/10, 14:30" */
export const fmtShortDateTime = (d: Date | string) => format(z(d), "dd/MM', 'HH:mm");
export const fmtDay = (d: Date | string) => format(z(d), "dd");
export const fmtMonthShort = (d: Date | string) => format(z(d), "MMM", { locale: ptBR }).replace(".", "").toUpperCase();
export const fmtMonthYear = (d: Date | string) => format(z(d), "MMMM 'de' yyyy", { locale: ptBR });

export function fmtRelative(d: Date | string, now = new Date()) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "agora";
  return `há ${formatDistanceStrict(date, now, { locale: ptBR })}`;
}

export function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function fmtMinutes(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}min` : `${h}h`;
}

export const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);

export const fmtTicketNumber = (n: number) => `#${String(n).padStart(4, "0")}`;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "1 solicitação" / "3 solicitações" (o plural é informado por extenso). */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
