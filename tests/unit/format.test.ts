import { describe, expect, it } from "vitest";
import { fmtDate, fmtDateLong, fmtDateTime } from "@/lib/format";

describe("formatação de datas", () => {
  it("data de calendário (coluna date) mantém o mesmo dia, sem conversão de fuso", () => {
    expect(fmtDate("2026-01-01")).toBe("01/01/2026");
    expect(fmtDate("2026-10-11")).toBe("11/10/2026");
    expect(fmtDateLong("2026-12-31")).toBe("31 de dez. de 2026");
  });

  it("instantes são exibidos no horário de Brasília", () => {
    expect(fmtDate(new Date("2026-01-01T01:00:00Z"))).toBe("31/12/2025");
    expect(fmtDateTime("2026-10-20T12:30:00Z")).toBe("20/10/2026 às 09:30");
  });
});
