import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";
import { employees } from "./org";
import { fileAssets } from "./platform";

export const ticketStatus = pgEnum("ticket_status", [
  "aberto",
  "em_andamento",
  "aguardando_colaborador",
  "respondido",
  "resolvido",
  "fechado",
  "cancelado",
]);
export type TicketStatus = (typeof ticketStatus.enumValues)[number];

/** Canal de abertura: formulário do portal ou conversa pelo chat de suporte (mesma fila, mesmo SLA). */
export const ticketChannel = pgEnum("ticket_channel", ["portal", "chat"]);
export type TicketChannel = (typeof ticketChannel.enumValues)[number];

export const ticketPriority = pgEnum("ticket_priority", ["baixa", "normal", "alta", "urgente"]);
export type TicketPriority = (typeof ticketPriority.enumValues)[number];

export const ticketCategories = pgTable("ticket_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  defaultPriority: ticketPriority("default_priority").notNull().default("normal"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Janelas de atendimento por dia da semana (0 = domingo … 6 = sábado), horários "HH:mm" no fuso do calendário. */
export type WorkingHours = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", Array<[string, string]>>>;

export const slaCalendars = pgTable("sla_calendars", {
  id: id(),
  name: text("name").notNull().unique(),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  workingHours: jsonb("working_hours").$type<WorkingHours>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const slaHolidays = pgTable(
  "sla_holidays",
  {
    id: id(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => slaCalendars.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
  },
  (t) => [unique("sla_holidays_uq").on(t.calendarId, t.date)],
);

export const slaPolicies = pgTable(
  "sla_policies",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => ticketCategories.id, { onDelete: "restrict" }),
    priority: ticketPriority("priority").notNull(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => slaCalendars.id, { onDelete: "restrict" }),
    firstResponseMinutes: integer("first_response_minutes").notNull(),
    resolutionMinutes: integer("resolution_minutes").notNull(),
    pauseStatuses: ticketStatus("pause_statuses").array().notNull().default(sql`ARRAY['aguardando_colaborador']::ticket_status[]`),
    /** Percentual do prazo consumido que dispara alerta de risco (escalonamento nível 1). */
    warnAtPercent: integer("warn_at_percent").notNull().default(80),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    /** Preenchido quando uma nova versão substitui esta política (histórico preservado). */
    supersededAt: tsz("superseded_at"),
  },
  (t) => [uniqueIndex("sla_policies_active_uq").on(t.categoryId, t.priority).where(sql`${t.supersededAt} IS NULL`)],
);

export const ticketNumberSeq = pgSequence("ticket_number_seq", { startWith: 1000 });

export const tickets = pgTable(
  "tickets",
  {
    id: id(),
    number: integer("number").notNull().unique().default(sql`nextval('ticket_number_seq')`),
    requesterEmployeeId: uuid("requester_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => ticketCategories.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    priority: ticketPriority("priority").notNull(),
    status: ticketStatus("status").notNull().default("aberto"),
    channel: ticketChannel("channel").notNull().default("portal"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
    slaPolicyId: uuid("sla_policy_id").references(() => slaPolicies.id, { onDelete: "restrict" }),
    firstResponseDueAt: tsz("first_response_due_at"),
    resolutionDueAt: tsz("resolution_due_at"),
    firstRespondedAt: tsz("first_responded_at"),
    resolvedAt: tsz("resolved_at"),
    closedAt: tsz("closed_at"),
    cancelledAt: tsz("cancelled_at"),
    /** Início da pausa corrente do SLA (nulo quando o relógio está correndo). */
    pausedAt: tsz("paused_at"),
    pausedBusinessMinutes: integer("paused_business_minutes").notNull().default(0),
    firstResponseBreachedAt: tsz("first_response_breached_at"),
    resolutionBreachedAt: tsz("resolution_breached_at"),
    warnedAt: tsz("warned_at"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tickets_requester_idx").on(t.requesterEmployeeId, t.createdAt),
    index("tickets_status_idx").on(t.status),
    index("tickets_assignee_idx").on(t.assigneeUserId),
  ],
);

/** Compartilhamento explícito de um ticket com outro usuário. */
export const ticketParticipants = pgTable(
  "ticket_participants",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedByUserId: uuid("added_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.ticketId, t.userId] }), index("ticket_participants_user_idx").on(t.userId)],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: id(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    /** Nota interna da equipe de atendimento — nunca exibida ao solicitante. */
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

export const ticketAttachments = pgTable(
  "ticket_attachments",
  {
    id: id(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => ticketMessages.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => fileAssets.id, { onDelete: "restrict" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_attachments_ticket_idx").on(t.ticketId)],
);

export const ticketEventType = pgEnum("ticket_event_type", [
  "created",
  "status_changed",
  "assigned",
  "priority_changed",
  "sla_paused",
  "sla_resumed",
  "sla_warning",
  "sla_breached",
  "message_added",
]);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: id(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    type: ticketEventType("type").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    /** Nulo = evento do sistema (ex.: job de SLA). */
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_events_ticket_idx").on(t.ticketId, t.createdAt)],
);

export const ticketDrafts = pgTable(
  "ticket_drafts",
  {
    id: id(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => ticketCategories.id, { onDelete: "set null" }),
    subject: text("subject").notNull().default(""),
    description: text("description").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ticket_drafts_employee_idx").on(t.employeeId)],
);
