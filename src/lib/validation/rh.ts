import { z } from "zod";

/** Schemas do ambiente de gestão, compartilhados cliente/servidor (o servidor sempre revalida). */

export const TICKET_STATUSES = ["aberto", "em_andamento", "aguardando_colaborador", "respondido", "resolvido", "fechado", "cancelado"] as const;
export const TICKET_PRIORITIES = ["baixa", "normal", "alta", "urgente"] as const;

export const agentReplySchema = z.object({
  body: z.string({ error: "Escreva a mensagem." }).trim().min(1, "Escreva a mensagem.").max(5000, "Use no máximo 5.000 caracteres."),
  internal: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  setStatus: z.enum(TICKET_STATUSES).optional().or(z.literal("").transform(() => undefined)),
});

export const agentStatusSchema = z.object({
  to: z.enum(TICKET_STATUSES, { error: "Escolha a nova situação." }),
  note: z.string().trim().max(500, "Use no máximo 500 caracteres.").optional(),
});

export const agentAssignSchema = z.object({ assigneeUserId: z.uuid().nullable() });

export const agentPrioritySchema = z.object({ priority: z.enum(TICKET_PRIORITIES, { error: "Escolha a prioridade." }) });
