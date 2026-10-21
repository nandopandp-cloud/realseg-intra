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

// ── Público-alvo (comunicados, cursos, oportunidades) ────────────────────────

const ids = z.array(z.uuid()).max(200);
export const audienceSchema = z
  .object({ all: z.boolean(), department: ids, unit: ids, job_position: ids, job_family: ids })
  .refine((a) => a.all || a.department.length + a.unit.length + a.job_position.length + a.job_family.length > 0, {
    message: "Escolha o público: todos os colaboradores ou ao menos uma área, unidade, cargo ou família.",
    path: ["all"],
  });
export type AudienceValue = z.infer<typeof audienceSchema>;

// ── Comunicados ──────────────────────────────────────────────────────────────

export const HIGHLIGHT_ICONS = ["check", "shield", "clock", "calendar", "alert", "shirt", "badge", "boot"] as const;
export const COVER_RE = /^\/(images\/[a-z0-9-]+\.webp|api\/v1\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

const optionalText = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .nullish()
    .transform((v) => v || null);

export const announcementSchema = z.object({
  title: z.string({ error: "Informe o título." }).trim().min(4, "O título precisa ter pelo menos 4 caracteres.").max(140, "Use no máximo 140 caracteres."),
  summary: z.string({ error: "Escreva um resumo." }).trim().min(10, "O resumo precisa ter pelo menos 10 caracteres.").max(300, "Use no máximo 300 caracteres."),
  body: z.string({ error: "Escreva o texto do comunicado." }).trim().min(10, "O texto precisa ter pelo menos 10 caracteres.").max(20000, "Use no máximo 20.000 caracteres."),
  categorySlug: z.string({ error: "Escolha a categoria." }).min(1, "Escolha a categoria.").max(50),
  coverImage: z.string().regex(COVER_RE, "Imagem de capa inválida.").nullish().transform((v) => v || null),
  effectiveNote: optionalText(300, "Use no máximo 300 caracteres."),
  highlights: z
    .array(
      z.object({
        icon: z.enum(HIGHLIGHT_ICONS),
        title: z.string().trim().min(2, "Dê um título ao item.").max(60, "Use no máximo 60 caracteres."),
        text: z.string().trim().min(2, "Descreva o item.").max(200, "Use no máximo 200 caracteres."),
      }),
    )
    .max(6, "Use no máximo 6 itens em “O que muda”."),
  tags: z
    .array(z.string().trim().toLowerCase().min(2).max(30))
    .max(10, "Use no máximo 10 tags.")
    .transform((t) => [...new Set(t)]),
  supportTicketCategory: z.string().max(50).nullish().transform((v) => v || null),
  isImportant: z.boolean(),
  requiresAck: z.boolean(),
  isFeatured: z.boolean(),
  authorLabel: z.string({ error: "Informe quem assina." }).trim().min(2, "Informe quem assina.").max(60, "Use no máximo 60 caracteres."),
  audience: audienceSchema,
  /** Em comunicado já publicado: alteração relevante gera nova versão (nova ciência). */
  relevantChange: z.boolean().optional(),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const announcementPublishSchema = z
  .object({
    mode: z.enum(["now", "schedule"]),
    publishAt: z.iso.datetime({ offset: true }).optional(),
    notify: z.boolean().default(true),
  })
  .refine((v) => v.mode === "now" || (v.publishAt && Date.parse(v.publishAt) > Date.now() + 60_000), {
    message: "Escolha uma data e hora futuras para agendar.",
    path: ["publishAt"],
  });
