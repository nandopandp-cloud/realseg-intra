import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { Ctx } from "../auth/actor";
import { getDb } from "../db/client";
import { announcementAudiences, announcements, documentCategories, documents, helpArticles, tickets } from "../db/schema";
import { audienceMatch, textSearch } from "./audience";
import { listCourses } from "./courses";

export type SearchResult = { group: "Comunicados" | "Documentos" | "Normas e manuais" | "Cursos" | "Ajuda" | "Solicitações"; title: string; description?: string; href: string };

/**
 * Busca global. Cada grupo aplica o MESMO escopo de autorização das telas
 * (público do comunicado, dono do documento, solicitante do ticket).
 */
export async function globalSearch(ctx: Ctx, q: string): Promise<SearchResult[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const db = getDb();
  const perms = ctx.actor.permissions;
  const e = ctx.actor.employee;
  const LIMIT = 5;

  const [anns, docs, policies, courseRows, articles, myTickets] = await Promise.all([
    perms.has("announcement:read")
      ? db
          .select({ id: announcements.id, title: announcements.title, summary: announcements.summary })
          .from(announcements)
          .where(and(eq(announcements.status, "published"), lte(announcements.publishedAt, sql`now()`), audienceMatch(announcementAudiences, announcementAudiences.announcementId, announcements.id, ctx.actor), textSearch([announcements.title, announcements.summary, announcements.body], term)))
          .orderBy(desc(announcements.publishedAt))
          .limit(LIMIT)
      : [],
    perms.has("document:read:own") && e
      ? db
          .select({ id: documents.id, title: documents.title, category: documentCategories.name })
          .from(documents)
          .innerJoin(documentCategories, eq(documentCategories.id, documents.categoryId))
          .where(and(eq(documents.scope, "personal"), eq(documents.ownerEmployeeId, e.id), eq(documents.status, "active"), textSearch([documents.title], term)))
          .orderBy(desc(documents.createdAt))
          .limit(LIMIT)
      : [],
    perms.has("policy:read")
      ? db
          .select({ id: documents.id, title: documents.title, description: documents.description })
          .from(documents)
          .where(and(eq(documents.scope, "institutional"), eq(documents.status, "active"), textSearch([documents.title, documents.description], term)))
          .limit(LIMIT)
      : [],
    perms.has("course:read") ? listCourses(ctx, { q: term }) : [],
    perms.has("help:read")
      ? db
          .select({ slug: helpArticles.slug, title: helpArticles.title, summary: helpArticles.summary })
          .from(helpArticles)
          .where(and(eq(helpArticles.status, "published"), textSearch([helpArticles.title, helpArticles.summary, helpArticles.body], term)))
          .orderBy(desc(helpArticles.viewCount))
          .limit(LIMIT)
      : [],
    perms.has("ticket:read:own") && e
      ? db
          .select({ number: tickets.number, subject: tickets.subject })
          .from(tickets)
          .where(and(eq(tickets.requesterEmployeeId, e.id), textSearch([tickets.subject], term)))
          .orderBy(desc(tickets.createdAt))
          .limit(LIMIT)
      : [],
  ]);

  return [
    ...anns.map((a) => ({ group: "Comunicados" as const, title: a.title, description: a.summary, href: `/comunicados/${a.id}` })),
    ...docs.map((d) => ({ group: "Documentos" as const, title: d.title, description: d.category, href: `/documentos/${d.id}` })),
    ...policies.map((d) => ({ group: "Normas e manuais" as const, title: d.title, description: d.description ?? undefined, href: `/documentos/${d.id}` })),
    ...courseRows.slice(0, LIMIT).map((c) => ({ group: "Cursos" as const, title: c.title, description: c.summary, href: `/cursos/${c.slug}` })),
    ...articles.map((a) => ({ group: "Ajuda" as const, title: a.title, description: a.summary, href: `/ajuda/artigos/${a.slug}` })),
    ...myTickets.map((t) => ({ group: "Solicitações" as const, title: `#${String(t.number).padStart(4, "0")} - ${t.subject}`, href: `/solicitacoes/${t.number}` })),
  ];
}
