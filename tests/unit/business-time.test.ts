import { describe, expect, it } from "vitest";
import {
  addBusinessMinutes,
  businessMinutesBetween,
  isWithinBusinessHours,
  minutesPerBusinessDay,
  type BusinessCalendar,
} from "@/server/sla/business-time";
import { computeSlaView, shiftDueAfterPause } from "@/server/sla/ticket-sla";

const weekdays = { "1": [["08:00", "18:00"]], "2": [["08:00", "18:00"]], "3": [["08:00", "18:00"]], "4": [["08:00", "18:00"]], "5": [["08:00", "18:00"]] } as BusinessCalendar["workingHours"];

const sp: BusinessCalendar = { timezone: "America/Sao_Paulo", workingHours: weekdays, holidays: new Set() };
// São Paulo = UTC-3 (sem horário de verão desde 2019)
const at = (iso: string) => new Date(iso);

describe("addBusinessMinutes", () => {
  it("soma dentro da mesma janela", () => {
    // Seg 05/10/2026 09:00 SP = 12:00Z
    expect(addBusinessMinutes(at("2026-10-05T12:00:00Z"), 120, sp).toISOString()).toBe("2026-10-05T14:00:00.000Z");
  });

  it("transborda para o próximo dia útil", () => {
    // Seg 17:00 SP + 2h úteis = Ter 09:00 SP
    expect(addBusinessMinutes(at("2026-10-05T20:00:00Z"), 120, sp).toISOString()).toBe("2026-10-06T12:00:00.000Z");
  });

  it("pula fim de semana", () => {
    // Sex 09/10 17:00 SP + 3h = Seg 12/10 10:00 SP
    expect(addBusinessMinutes(at("2026-10-09T20:00:00Z"), 180, sp).toISOString()).toBe("2026-10-12T13:00:00.000Z");
  });

  it("pula feriados", () => {
    const cal = { ...sp, holidays: new Set(["2026-10-12"]) };
    // Sex 17:00 + 3h => Seg é feriado => Ter 13/10 10:00 SP
    expect(addBusinessMinutes(at("2026-10-09T20:00:00Z"), 180, cal).toISOString()).toBe("2026-10-13T13:00:00.000Z");
  });

  it("início fora do expediente começa a contar na próxima abertura", () => {
    // Sáb 10/10 12:00 SP + 60 min => Seg 09:00 SP
    expect(addBusinessMinutes(at("2026-10-10T15:00:00Z"), 60, sp).toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });

  it("prazo zero fora do expediente vence na próxima abertura", () => {
    expect(addBusinessMinutes(at("2026-10-05T23:00:00Z"), 0, sp).toISOString()).toBe("2026-10-06T11:00:00.000Z");
  });

  it("respeita janelas múltiplas (intervalo de almoço)", () => {
    const cal: BusinessCalendar = { ...sp, workingHours: { "1": [["08:00", "12:00"], ["13:00", "17:00"]] } };
    // Seg 11:00 SP + 2h => 12:00 pausa => 14:00 SP
    expect(addBusinessMinutes(at("2026-10-05T14:00:00Z"), 120, cal).toISOString()).toBe("2026-10-05T17:00:00.000Z");
  });

  it("funciona em fuso com horário de verão (America/New_York)", () => {
    const ny: BusinessCalendar = { timezone: "America/New_York", workingHours: weekdays, holidays: new Set() };
    // Sex 30/10/2026 17:00 EDT (21:00Z) + 2h => Seg 02/11 09:00 EST (14:00Z) — DST termina em 01/11
    expect(addBusinessMinutes(at("2026-10-30T21:00:00Z"), 120, ny).toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("rejeita minutos negativos e calendário vazio", () => {
    expect(() => addBusinessMinutes(at("2026-10-05T12:00:00Z"), -1, sp)).toThrow();
    expect(() => addBusinessMinutes(at("2026-10-05T12:00:00Z"), 10, { ...sp, workingHours: {} })).toThrow();
  });

  it("rejeita horário malformado", () => {
    expect(() => addBusinessMinutes(at("2026-10-05T12:00:00Z"), 10, { ...sp, workingHours: { "1": [["8h", "18:00"]] } })).toThrow();
  });
});

describe("businessMinutesBetween", () => {
  it("é inverso de addBusinessMinutes", () => {
    const start = at("2026-10-08T19:30:00Z");
    const due = addBusinessMinutes(start, 1500, sp);
    expect(businessMinutesBetween(start, due, sp)).toBe(1500);
  });

  it("retorna 0 para intervalo invertido ou fora do expediente", () => {
    expect(businessMinutesBetween(at("2026-10-06T12:00:00Z"), at("2026-10-05T12:00:00Z"), sp)).toBe(0);
    // Sáb inteiro
    expect(businessMinutesBetween(at("2026-10-10T03:00:00Z"), at("2026-10-11T03:00:00Z"), sp)).toBe(0);
  });

  it("conta vários dias com fim de semana", () => {
    // Sex 08:00 SP até Seg 18:00 SP = 2 dias úteis = 1200 min
    expect(businessMinutesBetween(at("2026-10-09T11:00:00Z"), at("2026-10-12T21:00:00Z"), sp)).toBe(1200);
  });
});

describe("utilitários de calendário", () => {
  it("minutos por dia útil", () => {
    expect(minutesPerBusinessDay(sp)).toBe(600);
  });
  it("detecta horário de atendimento", () => {
    expect(isWithinBusinessHours(at("2026-10-05T12:00:00Z"), sp)).toBe(true);
    expect(isWithinBusinessHours(at("2026-10-05T22:00:00Z"), sp)).toBe(false);
    expect(isWithinBusinessHours(at("2026-10-10T12:00:00Z"), sp)).toBe(false);
  });
});

describe("computeSlaView", () => {
  const created = at("2026-10-05T11:00:00Z"); // Seg 08:00 SP
  const base = {
    createdAt: created,
    status: "em_andamento" as const,
    resolutionMinutes: 1800, // 3 dias úteis
    resolutionDueAt: addBusinessMinutes(created, 1800, sp),
    firstResponseDueAt: addBusinessMinutes(created, 240, sp),
    firstRespondedAt: null,
    resolvedAt: null,
    pausedAt: null,
    pausedBusinessMinutes: 0,
  };

  it("sem política não inventa prazo", () => {
    expect(computeSlaView({ ...base, resolutionMinutes: null }, sp, created).kind).toBe("none");
    expect(computeSlaView(base, null, created).kind).toBe("none");
  });

  it("em andamento no 2º dia", () => {
    const view = computeSlaView(base, sp, at("2026-10-06T15:00:00Z")); // Ter 12:00 SP => 600+240=840 min
    expect(view.kind).toBe("running");
    if (view.kind === "none") return;
    expect(view.elapsedMinutes).toBe(840);
    expect(view.progressLabel).toBe("2 de 3 dias úteis");
    expect(view.percent).toBe(47);
    expect(view.statusLabel).toBe("Restam 1 dia útil e 6h");
  });

  it("vencido", () => {
    const view = computeSlaView(base, sp, at("2026-10-08T14:00:00Z")); // Qui 11:00 SP
    expect(view.kind).toBe("overdue");
    if (view.kind === "none") return;
    expect(view.statusLabel).toBe("Prazo excedido há 3h");
  });

  it("pausado congela o tempo decorrido", () => {
    const view = computeSlaView({ ...base, status: "aguardando_colaborador", pausedAt: at("2026-10-05T13:00:00Z") }, sp, at("2026-10-09T13:00:00Z"));
    expect(view.kind).toBe("paused");
    if (view.kind === "none") return;
    expect(view.elapsedMinutes).toBe(120);
  });

  it("concluído dentro e fora do prazo", () => {
    expect(computeSlaView({ ...base, status: "resolvido", resolvedAt: at("2026-10-06T12:00:00Z") }, sp, at("2026-10-20T12:00:00Z")).kind).toBe("met");
    expect(computeSlaView({ ...base, status: "fechado", resolvedAt: at("2026-10-09T12:00:00Z") }, sp, at("2026-10-20T12:00:00Z")).kind).toBe("breached");
  });

  it("cancelado não exibe prazo", () => {
    expect(computeSlaView({ ...base, status: "cancelado" }, sp, created).kind).toBe("none");
  });

  it("primeira resposta violada", () => {
    const view = computeSlaView(base, sp, at("2026-10-05T16:00:00Z"));
    if (view.kind === "none") throw new Error("esperava SLA");
    expect(view.firstResponse?.breached).toBe(true);
  });

  it("retomada desloca o vencimento pelo tempo útil pausado", () => {
    const due = at("2026-10-07T21:00:00Z");
    const r = shiftDueAfterPause(due, at("2026-10-05T13:00:00Z"), at("2026-10-05T15:00:00Z"), sp);
    expect(r.pausedMinutes).toBe(120);
    expect(r.dueAt.toISOString()).toBe("2026-10-08T13:00:00.000Z");
  });
});
