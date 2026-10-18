import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tsz, updatedAt } from "./_shared";
import { users } from "./identity";
import { employees } from "./org";
import { ticketCategories } from "./tickets";

export const feedbackType = pgEnum("feedback_type", ["feedback", "avaliacao", "reconhecimento"]);
export const feedbackStatus = pgEnum("feedback_status", ["rascunho", "publicado", "arquivado"]);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: id(),
    /** Colaborador que recebe o feedback — único leitor (além de autor e RH autorizado). */
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Se falso, o colaborador vê apenas o contexto (ex.: "Gestão imediata"), não o nome do autor. */
    showAuthor: boolean("show_author").notNull().default(true),
    authorContext: text("author_context").notNull(),
    type: feedbackType("type").notNull(),
    title: text("title").notNull(),
    /** Ciclo/contexto (ex.: "Ciclo 2026.1"). */
    cycle: text("cycle"),
    body: text("body").notNull(),
    status: feedbackStatus("status").notNull().default("rascunho"),
    publishedAt: tsz("published_at"),
    /** Confirmação de leitura — não significa concordância. */
    acknowledgedAt: tsz("acknowledged_at"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("feedbacks_employee_idx").on(t.employeeId, t.status, t.publishedAt)],
);

export const helpCategories = pgTable("help_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

export const helpArticleType = pgEnum("help_article_type", ["artigo", "tutorial", "faq"]);
export const helpArticleStatus = pgEnum("help_article_status", ["draft", "published", "archived"]);

export const helpArticles = pgTable(
  "help_articles",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => helpCategories.id, { onDelete: "restrict" }),
    type: helpArticleType("type").notNull().default("artigo"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    icon: text("icon").notNull().default("file-text"),
    color: text("color").notNull().default("teal"),
    status: helpArticleStatus("status").notNull().default("draft"),
    /** Contador agregado e anônimo de acessos (não guarda quem leu). */
    viewCount: integer("view_count").notNull().default(0),
    relatedTicketCategoryId: uuid("related_ticket_category_id").references(() => ticketCategories.id, { onDelete: "set null" }),
    publishedAt: tsz("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("help_articles_category_idx").on(t.categoryId), index("help_articles_views_idx").on(t.viewCount)],
);

/** Um voto por usuário/artigo (evita duplicidade). Relatórios usam apenas agregados. */
export const helpArticleFeedback = pgTable(
  "help_article_feedback",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => helpArticles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    helpful: boolean("helpful").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.userId] })],
);
