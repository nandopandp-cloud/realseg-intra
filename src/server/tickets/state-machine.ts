import type { TicketStatus } from "../db/schema/tickets";

export type TicketActorKind = "requester" | "agent" | "system";

/**
 * Transições válidas e quem pode executá-las (documentado em docs/produto/requisitos.md §Solicitações).
 * Qualquer transição ausente é inválida.
 */
const TRANSITIONS: Record<TicketStatus, Partial<Record<TicketStatus, TicketActorKind[]>>> = {
  aberto: {
    em_andamento: ["agent"],
    aguardando_colaborador: ["agent"],
    respondido: ["agent"],
    resolvido: ["agent"],
    cancelado: ["requester", "agent"],
  },
  em_andamento: {
    aguardando_colaborador: ["agent"],
    respondido: ["agent"],
    resolvido: ["agent"],
    cancelado: ["requester", "agent"],
  },
  aguardando_colaborador: {
    em_andamento: ["requester", "agent", "system"],
    resolvido: ["agent"],
    cancelado: ["requester", "agent"],
  },
  respondido: {
    em_andamento: ["requester", "agent"],
    resolvido: ["requester", "agent"],
    fechado: ["system"],
  },
  resolvido: {
    em_andamento: ["requester", "agent"],
    fechado: ["requester", "system"],
  },
  fechado: {},
  cancelado: {},
};

export function canTransition(from: TicketStatus, to: TicketStatus, who: TicketActorKind): boolean {
  return TRANSITIONS[from]?.[to]?.includes(who) ?? false;
}

export function allowedTransitions(from: TicketStatus, who: TicketActorKind): TicketStatus[] {
  return (Object.entries(TRANSITIONS[from] ?? {}) as Array<[TicketStatus, TicketActorKind[]]>)
    .filter(([, actors]) => actors.includes(who))
    .map(([to]) => to);
}

export const TERMINAL: TicketStatus[] = ["fechado", "cancelado"];
export const OPEN_STATUSES: TicketStatus[] = ["aberto", "em_andamento", "aguardando_colaborador", "respondido"];

/** Status resultante quando o solicitante envia uma mensagem. */
export function statusAfterRequesterReply(current: TicketStatus): TicketStatus | null {
  switch (current) {
    case "aguardando_colaborador":
    case "respondido":
    case "resolvido":
      return "em_andamento";
    case "aberto":
    case "em_andamento":
      return current;
    default:
      return null; // fechado/cancelado não aceitam mensagens
  }
}

/** Janela (dias corridos) para o colaborador reabrir um ticket resolvido. */
export const REOPEN_WINDOW_DAYS = 7;
