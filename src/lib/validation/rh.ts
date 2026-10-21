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

// ── Documentos ───────────────────────────────────────────────────────────────

const boolField = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => v === "true");
const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .optional()
  .or(z.literal("").transform(() => undefined))
  .nullish();
const periodField = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato mês/ano.")
  .optional()
  .or(z.literal("").transform(() => undefined))
  .nullish();

export const submissionReviewSchema = z.object({
  action: z.enum(["start", "accept", "refuse"]),
  note: z.string().trim().max(1000, "Use no máximo 1.000 caracteres.").optional(),
  version: z.number().int().min(1),
});

/** Campos do formulário (multipart) de distribuição de documento pessoal. */
export const distributeFieldsSchema = z.object({
  employeeId: z.uuid({ error: "Escolha o colaborador." }),
  categorySlug: z.string({ error: "Escolha o tipo de documento." }).min(1, "Escolha o tipo de documento.").max(50),
  title: z.string().trim().max(140, "Use no máximo 140 caracteres.").optional(),
  description: z.string().trim().max(1000, "Use no máximo 1.000 caracteres.").optional(),
  referencePeriod: periodField,
  requiresAck: boolField,
});

export const institutionalFieldsSchema = z
  .object({
    categorySlug: z.string({ error: "Escolha o tipo." }).min(1, "Escolha o tipo.").max(50),
    title: z.string({ error: "Informe o título." }).trim().min(3, "Use pelo menos 3 caracteres.").max(140, "Use no máximo 140 caracteres."),
    description: z.string().trim().max(1000, "Use no máximo 1.000 caracteres.").optional(),
    requiresAck: boolField,
    notify: boolField,
    effectiveFrom: dateField,
    effectiveUntil: dateField,
  })
  .refine((v) => !v.effectiveFrom || !v.effectiveUntil || v.effectiveUntil >= v.effectiveFrom, { message: "O fim da vigência deve ser depois do início.", path: ["effectiveUntil"] });

export const documentMetaSchema = z
  .object({
    title: z.string({ error: "Informe o título." }).trim().min(3, "Use pelo menos 3 caracteres.").max(140, "Use no máximo 140 caracteres."),
    description: z.string().trim().max(1000, "Use no máximo 1.000 caracteres.").nullish(),
    referencePeriod: periodField,
    requiresAck: z.boolean(),
    effectiveFrom: dateField,
    effectiveUntil: dateField,
  })
  .refine((v) => !v.effectiveFrom || !v.effectiveUntil || v.effectiveUntil >= v.effectiveFrom, { message: "O fim da vigência deve ser depois do início.", path: ["effectiveUntil"] });

export const versionFieldsSchema = z.object({ changeNote: z.string().trim().max(300, "Use no máximo 300 caracteres.").optional(), notify: boolField });
export const batchPreviewSchema = z.object({ names: z.array(z.string().max(255)).min(1).max(300) });
export const removeReasonSchema = z.object({ reason: z.string({ error: "Informe o motivo." }).trim().min(3, "Informe o motivo.").max(200, "Use no máximo 200 caracteres.") });

// ── Colaboradores e estrutura ────────────────────────────────────────────────

export const EXTRA_ROLES = ["RH", "GESTOR", "ADMIN"] as const;

export const employeeSchema = z.object({
  fullName: z.string({ error: "Informe o nome completo." }).trim().min(3, "Informe o nome completo.").max(120, "Use no máximo 120 caracteres."),
  preferredName: z.string().trim().max(60, "Use no máximo 60 caracteres.").nullish(),
  registrationNumber: z.string({ error: "Informe a matrícula." }).trim().regex(/^\d{3,12}$/, "A matrícula deve ter só números (3 a 12 dígitos)."),
  email: z.email({ error: "Informe um e-mail válido." }).trim().max(160),
  departmentId: z.uuid({ error: "Escolha a área." }),
  unitId: z.uuid({ error: "Escolha a unidade." }),
  jobPositionId: z.uuid({ error: "Escolha o cargo." }),
  managerEmployeeId: z.uuid().nullish(),
  admissionDate: z.string({ error: "Informe a data de admissão." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de admissão."),
});
export const createEmployeeSchema = employeeSchema.extend({
  access: z.enum(["temp", "invite"]),
  roles: z.array(z.enum(EXTRA_ROLES)).max(3).default([]),
});
export const employeeStatusSchema = z.object({ status: z.enum(["ativo", "afastado", "desligado"]) });
export const accessResetSchema = z.object({ mode: z.enum(["temp", "invite"]) });
export const rolesSchema = z.object({ roles: z.array(z.enum(EXTRA_ROLES)).max(3) });
export const importSchema = z.object({ csv: z.string().min(1, "Selecione a planilha.").max(600_000, "Planilha muito grande (máx. 500 linhas)."), dryRun: z.boolean() });

export const departmentSchema = z.object({
  code: z.string({ error: "Informe o código." }).trim().regex(/^[A-Za-z0-9_-]{2,20}$/, "Use 2 a 20 letras, números, - ou _."),
  name: z.string({ error: "Informe o nome." }).trim().min(2, "Informe o nome.").max(80, "Use no máximo 80 caracteres."),
  parentId: z.uuid().nullish(),
  active: z.boolean(),
});
export const unitSchema = z.object({
  name: z.string({ error: "Informe o nome." }).trim().min(2, "Informe o nome.").max(80, "Use no máximo 80 caracteres."),
  city: z.string({ error: "Informe a cidade." }).trim().min(2, "Informe a cidade.").max(80),
  state: z.string({ error: "Informe a UF." }).trim().regex(/^[A-Za-z]{2}$/, "Use a sigla com 2 letras (ex.: SP)."),
  active: z.boolean(),
});
export const familySchema = z.object({
  name: z.string({ error: "Informe o nome." }).trim().min(2, "Informe o nome.").max(80, "Use no máximo 80 caracteres."),
  description: z.string().trim().max(500, "Use no máximo 500 caracteres.").nullish(),
});
export const positionSchema = z.object({
  title: z.string({ error: "Informe o cargo." }).trim().min(2, "Informe o cargo.").max(100, "Use no máximo 100 caracteres."),
  familyId: z.uuid({ error: "Escolha a família." }),
  level: z.coerce.number({ error: "Informe o nível." }).int().min(1, "Nível mínimo 1.").max(20, "Nível máximo 20."),
  levelLabel: z.string({ error: "Informe o rótulo do nível." }).trim().min(1, "Ex.: Júnior, Pleno, I, II.").max(40),
  description: z.string().trim().max(1000).nullish(),
  requirements: z.string().trim().max(2000).nullish(),
  progressionCriteria: z.string().trim().max(2000).nullish(),
  active: z.boolean(),
});

// ── Cursos ───────────────────────────────────────────────────────────────────

export const TONES = ["teal", "blue", "indigo", "purple", "amber", "red", "orange", "slate", "green"] as const;

export const courseSchema = z
  .object({
    title: z.string({ error: "Informe o título." }).trim().min(3, "Informe o título.").max(140, "Use no máximo 140 caracteres."),
    slug: z.string({ error: "Informe o endereço." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.").max(80),
    summary: z.string({ error: "Escreva um resumo." }).trim().min(10, "O resumo precisa ter pelo menos 10 caracteres.").max(300, "Use no máximo 300 caracteres."),
    description: z.string({ error: "Descreva o curso." }).trim().min(10, "A descrição precisa ter pelo menos 10 caracteres.").max(5000, "Use no máximo 5.000 caracteres."),
    categorySlug: z.string({ error: "Escolha a categoria." }).min(1, "Escolha a categoria.").max(50),
    coverImage: z.string().regex(COVER_RE, "Imagem de capa inválida.").nullish().transform((v) => v || null),
    isMandatory: z.boolean(),
    mandatoryDueDays: z.number().int().min(1, "Mínimo 1 dia.").max(365, "Máximo 365 dias.").nullable(),
    issuesCertificate: z.boolean(),
    audience: audienceSchema,
  })
  .refine((v) => !v.isMandatory || v.mandatoryDueDays, { message: "Informe o prazo (em dias) para concluir.", path: ["mandatoryDueDays"] });

export const courseStatusSchema = z.object({ status: z.enum(["draft", "published", "archived"]) });
export const moduleSchema = z.object({ title: z.string({ error: "Dê um nome ao módulo." }).trim().min(2, "Dê um nome ao módulo.").max(120) });
export const moveSchema = z.object({ dir: z.union([z.literal(-1), z.literal(1)]) });
export const lessonSchema = z.object({
  title: z.string({ error: "Dê um título à aula." }).trim().min(2, "Dê um título à aula.").max(140),
  type: z.enum(["texto", "video", "material"]),
  content: z.string().max(20000, "Use no máximo 20.000 caracteres.").default(""),
  videoUrl: z.string().trim().max(500).nullish().transform((v) => v || null),
  durationMinutes: z.number({ error: "Informe a duração." }).int().min(1, "Mínimo 1 minuto.").max(600, "Máximo 600 minutos."),
});
export const assignSchema = z.object({
  target: z.enum(["audience", "employees"]),
  employeeIds: z.array(z.uuid()).max(500).optional(),
  dueDays: z.number().int().min(1).max(365).nullable(),
});
export const pathSchema = z.object({
  title: z.string({ error: "Dê um nome à trilha." }).trim().min(3, "Dê um nome à trilha.").max(100),
  description: z.string().trim().max(500, "Use no máximo 500 caracteres.").default(""),
  color: z.enum(TONES),
  icon: z.string().min(1).max(40),
  jobFamilyId: z.uuid().nullish().transform((v) => v ?? null),
  courseIds: z.array(z.uuid()).max(50),
});
export const courseCategorySchema = z.object({
  name: z.string({ error: "Informe o nome." }).trim().min(2, "Informe o nome.").max(60),
  color: z.enum(TONES),
  icon: z.string().min(1).max(40),
});
