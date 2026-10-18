import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, statusAfterRequesterReply } from "@/server/tickets/state-machine";

describe("máquina de estados de tickets", () => {
  it("colaborador pode cancelar enquanto não resolvido", () => {
    expect(canTransition("aberto", "cancelado", "requester")).toBe(true);
    expect(canTransition("em_andamento", "cancelado", "requester")).toBe(true);
    expect(canTransition("aguardando_colaborador", "cancelado", "requester")).toBe(true);
    expect(canTransition("respondido", "cancelado", "requester")).toBe(false);
    expect(canTransition("resolvido", "cancelado", "requester")).toBe(false);
  });

  it("colaborador não altera status de atendimento", () => {
    expect(canTransition("aberto", "em_andamento", "requester")).toBe(false);
    expect(canTransition("aberto", "resolvido", "requester")).toBe(false);
    expect(canTransition("em_andamento", "aguardando_colaborador", "requester")).toBe(false);
  });

  it("estados terminais não têm saída", () => {
    expect(allowedTransitions("fechado", "agent")).toEqual([]);
    expect(allowedTransitions("cancelado", "requester")).toEqual([]);
  });

  it("confirmação de resolução e reabertura", () => {
    expect(canTransition("respondido", "resolvido", "requester")).toBe(true);
    expect(canTransition("resolvido", "fechado", "requester")).toBe(true);
    expect(canTransition("resolvido", "em_andamento", "requester")).toBe(true);
  });

  it("resposta do colaborador retoma o atendimento", () => {
    expect(statusAfterRequesterReply("aguardando_colaborador")).toBe("em_andamento");
    expect(statusAfterRequesterReply("respondido")).toBe("em_andamento");
    expect(statusAfterRequesterReply("aberto")).toBe("aberto");
    expect(statusAfterRequesterReply("fechado")).toBeNull();
    expect(statusAfterRequesterReply("cancelado")).toBeNull();
  });
});
