import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, tsz, updatedAt } from "./_shared";
import { departments } from "./org";

export const userStatus = pgEnum("user_status", ["active", "inactive"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: userStatus("status").notNull().default("active"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: tsz("locked_until"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    passwordChangedAt: tsz("password_changed_at"),
    lastLoginAt: tsz("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: tsz("deleted_at"),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)],
);

export const roles = pgTable("roles", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
});

export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    /** Escopo organizacional opcional (ex.: GESTOR de um setor). Nulo = sem restrição de setor. */
    scopeDepartmentId: uuid("scope_department_id").references(() => departments.id, { onDelete: "cascade" }),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [unique("user_roles_uq").on(t.userId, t.roleId, t.scopeDepartmentId).nullsNotDistinct(), index("user_roles_user_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 (hex) do token entregue no cookie. O token em si nunca é armazenado. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastSeenAt: tsz("last_seen_at").notNull().defaultNow(),
    expiresAt: tsz("expires_at").notNull(),
    revokedAt: tsz("revoked_at"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: tsz("expires_at").notNull(),
    usedAt: tsz("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

/** Janela fixa por chave (ex.: "login:ip:<hash>"). Atualizada com upsert atômico. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: tsz("reset_at").notNull(),
});

/** Driver "outbox" de e-mail (ADR-0008) — somente dev/teste. */
export const mailOutbox = pgTable("mail_outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  createdAt: createdAt(),
});
