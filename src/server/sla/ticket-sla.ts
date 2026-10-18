import type { TicketStatus } from "../db/schema/tickets";
import { addBusinessMinutes, businessMinutesBetween, minutesPerBusinessDay, type BusinessCalendar } from "./business-time";

export type SlaSnapshot = {
  createdAt: Date;
  status: TicketStatus;
  resolutionMinutes: number | null;
  resolutionDueAt: Date | null;
  firstResponseDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  pausedAt: Date | null;
  pausedBusinessMinutes: number;
};

export type SlaView =
  | { kind: "none" }
  | {
      kind: "running" | "paused" | "met" | "breached" | "overdue";
      dueAt: Date;
      totalMinutes: number;
      elapsedMinutes: number;
      remainingMinutes: number;
      percent: number;
      unit: "days" | "hours";
      /** Ex.: "2 de 3 dias úteis" / "3h de 8h úteis" */
      progressLabel: string;
      /** Texto compreensível para o colaborador. */
      statusLabel: string;
      firstResponse: { dueAt: Date | null; respondedAt: Date | null; breached: boolean } | null;
    };

const DONE: TicketStatus[] = ["resolvido", "fechado"];

function formatSpan(minutes: number, perDay: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (perDay > 0 && m >= perDay) {
    const days = Math.floor(m / perDay);
    const hours = Math.round((m - days * perDay) / 60);
    return hours > 0 ? `${days} ${days === 1 ? "dia útil" : "dias úteis"} e ${hours}h` : `${days} ${days === 1 ? "dia útil" : "dias úteis"}`;
  }
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h${String(rest).padStart(2, "0")}` : `${h}h`;
  }
  return `${m} min`;
}

/** Calcula a visão de SLA de resolução exibida ao colaborador. Nunca inventa prazo: sem política => "none". */
export function computeSlaView(t: SlaSnapshot, cal: BusinessCalendar | null, now: Date): SlaView {
  if (!cal || t.resolutionMinutes == null || !t.resolutionDueAt || t.status === "cancelado") return { kind: "none" };
  const perDay = minutesPerBusinessDay(cal);
  const total = t.resolutionMinutes;
  const end = DONE.includes(t.status) && t.resolvedAt ? t.resolvedAt : t.pausedAt ?? now;
  const elapsed = Math.max(0, businessMinutesBetween(t.createdAt, end, cal) - t.pausedBusinessMinutes);
  const remaining = total - elapsed;
  const percent = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 100;

  const unit: "days" | "hours" = perDay > 0 && total >= perDay ? "days" : "hours";
  let progressLabel: string;
  if (unit === "days") {
    const totalDays = Math.max(1, Math.round(total / perDay));
    const currentDay = Math.min(totalDays, Math.max(1, Math.ceil(elapsed / perDay)));
    progressLabel = `${elapsed === 0 ? 0 : currentDay} de ${totalDays} ${totalDays === 1 ? "dia útil" : "dias úteis"}`;
  } else {
    progressLabel = `${formatSpan(Math.min(elapsed, total), perDay)} de ${formatSpan(total, perDay)} úteis`;
  }

  const firstResponse = t.firstResponseDueAt
    ? {
        dueAt: t.firstResponseDueAt,
        respondedAt: t.firstRespondedAt,
        breached: t.firstRespondedAt ? t.firstRespondedAt > t.firstResponseDueAt : now > t.firstResponseDueAt,
      }
    : null;

  const base = { dueAt: t.resolutionDueAt, totalMinutes: total, elapsedMinutes: elapsed, remainingMinutes: remaining, percent, unit, progressLabel, firstResponse };

  if (DONE.includes(t.status)) {
    const late = !!t.resolvedAt && t.resolvedAt > t.resolutionDueAt;
    return { ...base, kind: late ? "breached" : "met", statusLabel: late ? "Concluído após o prazo" : "Concluído dentro do prazo" };
  }
  if (t.pausedAt) {
    return { ...base, kind: "paused", statusLabel: "Prazo pausado enquanto aguardamos sua resposta" };
  }
  if (remaining < 0) {
    return { ...base, kind: "overdue", statusLabel: `Prazo excedido há ${formatSpan(-remaining, perDay)}` };
  }
  return { ...base, kind: "running", statusLabel: `Restam ${formatSpan(remaining, perDay)}` };
}

/** Novo vencimento de resolução ao retomar uma pausa (desloca pelo tempo útil pausado). */
export function shiftDueAfterPause(dueAt: Date, pausedAt: Date, resumedAt: Date, cal: BusinessCalendar) {
  const paused = businessMinutesBetween(pausedAt, resumedAt, cal);
  return { pausedMinutes: paused, dueAt: paused > 0 ? addBusinessMinutes(dueAt, paused, cal) : dueAt };
}
