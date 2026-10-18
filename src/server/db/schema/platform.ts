import { bigserial, boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";

export const fileScanStatus = pgEnum("file_scan_status", ["pending", "clean", "infected", "skipped"]);

/** Metadados de arquivos privados. O conteúdo fica no StorageProvider (ADR-0007). */
export const fileAssets = pgTable("file_assets", {
  id: id(),
  storageKey: text("storage_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  scanStatus: fileScanStatus("scan_status").notNull().default("pending"),
  createdAt: createdAt(),
  deletedAt: tsz("deleted_at"),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    /** Nunca inclui conteúdo sensível — apenas identificadores e metadados operacionais. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipHash: text("ip_hash"),
    requestId: text("request_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_actor_idx").on(t.actorUserId, t.createdAt),
    index("audit_action_idx").on(t.action, t.createdAt),
  ],
);

export const notificationCategory = pgEnum("notification_category", [
  "comunicados",
  "documentos",
  "solicitacoes",
  "cursos",
  "carreira",
  "feedbacks",
  "conta",
]);
export type NotificationCategory = (typeof notificationCategory.enumValues)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: notificationCategory("category").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** Caminho interno relativo (ex.: /comunicados/<id>). Nunca contém dados sensíveis. */
    link: text("link"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    readAt: tsz("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt), index("notifications_unread_idx").on(t.userId, t.readAt)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: notificationCategory("category").notNull(),
    inApp: boolean("in_app").notNull().default(true),
    email: boolean("email").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })],
);

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Atalhos escolhidos pelo colaborador na Home ("Personalizar"). */
  homeShortcuts: text("home_shortcuts").array(),
  sidebarCollapsed: boolean("sidebar_collapsed").notNull().default(false),
  updatedAt: updatedAt(),
});
