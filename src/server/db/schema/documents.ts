import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgSequence, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";
import { employees } from "./org";
import { fileAssets } from "./platform";

export const documentCategoryKind = pgEnum("document_category_kind", ["personal", "institutional", "submission"]);

export const documentCategories = pgTable("document_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: documentCategoryKind("kind").notNull(),
  description: text("description"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  /** Documentos sensíveis (holerite, atestado, advertência, feedback): todo acesso é auditado. */
  sensitive: boolean("sensitive").notNull().default(false),
  /** Prazo de retenção em meses após o fim do vínculo (definido pelo jurídico/RH). Nulo = a definir. */
  retentionMonths: integer("retention_months"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const documentScope = pgEnum("document_scope", ["personal", "institutional"]);
export const documentStatus = pgEnum("document_status", ["active", "archived"]);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => documentCategories.id, { onDelete: "restrict" }),
    scope: documentScope("scope").notNull(),
    /** Destinatário (obrigatório para documentos pessoais). */
    ownerEmployeeId: uuid("owner_employee_id").references(() => employees.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Competência de referência (ex.: 2026-09 para holerite). */
    referencePeriod: text("reference_period"),
    requiresAck: boolean("requires_ack").notNull().default(false),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveUntil: date("effective_until", { mode: "string" }),
    currentVersionId: uuid("current_version_id"),
    status: documentStatus("status").notNull().default("active"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: tsz("deleted_at"),
  },
  (t) => [
    check("documents_personal_owner_ck", sql`${t.scope} <> 'personal' OR ${t.ownerEmployeeId} IS NOT NULL`),
    index("documents_owner_idx").on(t.ownerEmployeeId, t.createdAt),
    index("documents_scope_category_idx").on(t.scope, t.categoryId),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: id(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => fileAssets.id, { onDelete: "restrict" }),
    changeNote: text("change_note"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [unique("document_versions_uq").on(t.documentId, t.versionNumber)],
);

/** Confirmação explícita de ciência — abrir/baixar não equivale a concordância. */
export const documentAcknowledgements = pgTable(
  "document_acknowledgements",
  {
    id: id(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => documentVersions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acknowledgedAt: tsz("acknowledged_at").notNull().defaultNow(),
  },
  (t) => [unique("document_ack_uq").on(t.versionId, t.userId), index("document_ack_user_idx").on(t.userId)],
);

export const submissionNumberSeq = pgSequence("document_submission_number_seq", { startWith: 1000 });

export const submissionStatus = pgEnum("submission_status", ["enviado", "em_analise", "aceito", "recusado", "cancelado"]);
export type SubmissionStatus = (typeof submissionStatus.enumValues)[number];

export const documentSubmissions = pgTable(
  "document_submissions",
  {
    id: id(),
    number: integer("number")
      .notNull()
      .unique()
      .default(sql`nextval('document_submission_number_seq')`),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => documentCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    notes: text("notes"),
    /** Data a que o documento se refere (ex.: data do atestado). */
    referenceDate: date("reference_date", { mode: "string" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => fileAssets.id, { onDelete: "restrict" }),
    status: submissionStatus("status").notNull().default("enviado"),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewNote: text("review_note"),
    reviewedAt: tsz("reviewed_at"),
    /** Controle otimista de concorrência para transições. */
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("document_submissions_employee_idx").on(t.employeeId, t.createdAt), index("document_submissions_status_idx").on(t.status)],
);

export const documentSubmissionEvents = pgTable(
  "document_submission_events",
  {
    id: id(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => documentSubmissions.id, { onDelete: "cascade" }),
    fromStatus: submissionStatus("from_status"),
    toStatus: submissionStatus("to_status").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("document_submission_events_sub_idx").on(t.submissionId, t.createdAt)],
);
