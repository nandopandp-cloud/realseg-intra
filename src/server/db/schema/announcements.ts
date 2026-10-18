import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { audienceType, createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";
import { units } from "./org";
import { fileAssets } from "./platform";

export const announcementCategories = pgTable("announcement_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Chave de cor do design system (teal, blue, amber, purple, red, slate). */
  color: text("color").notNull(),
  /** Nome do ícone Lucide mapeado no frontend. */
  icon: text("icon").notNull(),
  createdAt: createdAt(),
});

export const announcementStatus = pgEnum("announcement_status", ["draft", "scheduled", "published", "archived"]);
export type AnnouncementStatus = (typeof announcementStatus.enumValues)[number];

export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => announcementCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    /** Texto com marcação simples (parágrafos, listas, negrito) renderizado com escape — nunca HTML bruto. */
    body: text("body").notNull(),
    isImportant: boolean("is_important").notNull().default(false),
    requiresAck: boolean("requires_ack").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    status: announcementStatus("status").notNull().default("draft"),
    publishAt: tsz("publish_at"),
    publishedAt: tsz("published_at"),
    archivedAt: tsz("archived_at"),
    /** Incrementada a cada alteração relevante após publicação; leitura/ciência são registradas por versão. */
    version: integer("version").notNull().default(1),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Nome exibido do autor/área responsável (ex.: "Recursos Humanos"). */
    authorLabel: text("author_label").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("announcements_status_published_idx").on(t.status, t.publishedAt)],
);

export const announcementAudiences = pgTable(
  "announcement_audiences",
  {
    id: id(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    type: audienceType("type").notNull(),
    refId: uuid("ref_id"),
  },
  (t) => [index("announcement_audiences_ann_idx").on(t.announcementId)],
);

export const announcementReads = pgTable(
  "announcement_reads",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    readAt: tsz("read_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId, t.version] }), index("announcement_reads_user_idx").on(t.userId)],
);

export const announcementAcknowledgements = pgTable(
  "announcement_acknowledgements",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    acknowledgedAt: tsz("acknowledged_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId, t.version] })],
);

export const announcementFavorites = pgTable(
  "announcement_favorites",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId] })],
);

export const announcementAttachments = pgTable(
  "announcement_attachments",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => fileAssets.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.fileId] })],
);

export const eventStatus = pgEnum("event_status", ["scheduled", "cancelled"]);

/** Agenda corporativa ("Próximos eventos"). Unidade nula = evento para todas as unidades. */
export const events = pgTable(
  "events",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startsAt: tsz("starts_at").notNull(),
    endsAt: tsz("ends_at"),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    announcementId: uuid("announcement_id").references(() => announcements.id, { onDelete: "set null" }),
    status: eventStatus("status").notNull().default("scheduled"),
    createdAt: createdAt(),
  },
  (t) => [index("events_starts_idx").on(t.startsAt)],
);
