import { TZDate } from "@date-fns/tz";
import type { WorkingHours } from "../db/schema/tickets";

export type BusinessCalendar = {
  timezone: string;
  workingHours: WorkingHours;
  /** Datas locais "YYYY-MM-DD" sem expediente. */
  holidays: ReadonlySet<string>;
};

const MINUTE = 60_000;
const MAX_DAYS = 3 * 366;

type LocalDate = { y: number; m: number; d: number; weekday: number };

function localDateOf(instant: Date, tz: string): LocalDate {
  const z = new TZDate(instant.getTime(), tz);
  return { y: z.getFullYear(), m: z.getMonth(), d: z.getDate(), weekday: z.getDay() };
}

function nextDay(ld: LocalDate): LocalDate {
  const u = new Date(Date.UTC(ld.y, ld.m, ld.d + 1));
  return { y: u.getUTCFullYear(), m: u.getUTCMonth(), d: u.getUTCDate(), weekday: u.getUTCDay() };
}

const key = (ld: LocalDate) => `${ld.y}-${String(ld.m + 1).padStart(2, "0")}-${String(ld.d).padStart(2, "0")}`;

function parseHm(hm: string): [number, number] {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) throw new Error(`Horário inválido no calendário: ${hm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) throw new Error(`Horário inválido no calendário: ${hm}`);
  return [h, min];
}

/** Janelas de expediente (instantes UTC) de um dia local. */
function windowsFor(ld: LocalDate, cal: BusinessCalendar): Array<[number, number]> {
  if (cal.holidays.has(key(ld))) return [];
  const slots = cal.workingHours[String(ld.weekday) as keyof WorkingHours] ?? [];
  return slots
    .map(([s, e]) => {
      const [sh, sm] = parseHm(s);
      const [eh, em] = parseHm(e);
      const start = new TZDate(ld.y, ld.m, ld.d, sh, sm, 0, 0, cal.timezone).getTime();
      const end = new TZDate(ld.y, ld.m, ld.d, eh, em, 0, 0, cal.timezone).getTime();
      return [start, end] as [number, number];
    })
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
}

function hasAnyWorkingTime(cal: BusinessCalendar) {
  return Object.values(cal.workingHours).some((slots) => (slots ?? []).length > 0);
}

/** Soma `minutes` minutos úteis a partir de `start`. Retorna o instante de vencimento. */
export function addBusinessMinutes(start: Date, minutes: number, cal: BusinessCalendar): Date {
  if (!Number.isFinite(minutes) || minutes < 0) throw new Error("Minutos devem ser um número não negativo.");
  if (!hasAnyWorkingTime(cal)) throw new Error("Calendário sem expediente configurado.");
  let remaining = minutes * MINUTE;
  let cursor = start.getTime();
  let day = localDateOf(start, cal.timezone);

  for (let i = 0; i < MAX_DAYS; i++) {
    for (const [ws, we] of windowsFor(day, cal)) {
      const from = Math.max(ws, cursor);
      if (from >= we) continue;
      const available = we - from;
      if (remaining <= available) {
        // Prazo zero em horário fora do expediente vence no próximo início de janela.
        return new Date(from + remaining);
      }
      remaining -= available;
      cursor = we;
    }
    day = nextDay(day);
  }
  throw new Error("Não foi possível calcular o prazo dentro do horizonte de 3 anos.");
}

/** Minutos úteis entre dois instantes (0 se end <= start). */
export function businessMinutesBetween(start: Date, end: Date, cal: BusinessCalendar): number {
  const a = start.getTime();
  const b = end.getTime();
  if (b <= a) return 0;
  let total = 0;
  let day = localDateOf(start, cal.timezone);
  for (let i = 0; i < MAX_DAYS; i++) {
    const windows = windowsFor(day, cal);
    for (const [ws, we] of windows) {
      const from = Math.max(ws, a);
      const to = Math.min(we, b);
      if (to > from) total += to - from;
    }
    const lastEnd = windows.length ? windows[windows.length - 1][1] : 0;
    // Termina quando o dia corrente já passou do fim do intervalo.
    const dayStart = new TZDate(day.y, day.m, day.d, 0, 0, 0, 0, cal.timezone).getTime();
    if (dayStart > b || (lastEnd && lastEnd >= b)) break;
    day = nextDay(day);
  }
  return Math.floor(total / MINUTE);
}

/** Minutos úteis de um dia típico (média dos dias com expediente) — usado para exibir prazos em "dias úteis". */
export function minutesPerBusinessDay(cal: BusinessCalendar): number {
  const totals = Object.values(cal.workingHours)
    .map((slots) =>
      (slots ?? []).reduce((acc, [s, e]) => {
        const [sh, sm] = parseHm(s);
        const [eh, em] = parseHm(e);
        return acc + Math.max(0, eh * 60 + em - (sh * 60 + sm));
      }, 0),
    )
    .filter((m) => m > 0);
  if (!totals.length) return 0;
  return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
}

/** Verdadeiro se o instante está dentro de uma janela de expediente (ex.: "Online" no atendimento). */
export function isWithinBusinessHours(instant: Date, cal: BusinessCalendar): boolean {
  const t = instant.getTime();
  return windowsFor(localDateOf(instant, cal.timezone), cal).some(([s, e]) => t >= s && t < e);
}
