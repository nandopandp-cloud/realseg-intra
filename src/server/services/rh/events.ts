import { and, asc, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { announcements, events, units } from "../../db/schema";
import { notFound, validation } from "../../errors";

export const EVENT_TABS = ["proximos", "passados", "cancelados"] as const;

/** Agenda corporativa ("Próximos eventos" na Home e em Comunicados). Unidade nula = todas as unidades. */
export async function listEventsAdmin(ctx: Ctx, tab: (typeof EVENT_TABS)[number] = "proximos") {
  requirePermission(ctx.actor, "announcement:manage");
  const now = sql`now()`;
  const where =
    tab === "cancelados"
      ? eq(events.status, "cancelled")
      : tab === "passados"
        ? and(eq(events.status, "scheduled"), lt(sql`coalesce(${events.endsAt}, ${events.startsAt})`, now))
        : and(eq(events.status, "scheduled"), gte(sql`coalesce(${events.endsAt}, ${events.startsAt})`, now));
  return getDb()
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      status: events.status,
      unitId: events.unitId,
      unitName: units.name,
      announcementId: events.announcementId,
      announcementTitle: announcements.title,
    })
    .from(events)
    .leftJoin(units, eq(units.id, events.unitId))
    .leftJoin(announcements, eq(announcements.id, events.announcementId))
    .where(where)
    .orderBy(tab === "proximos" ? asc(events.startsAt) : desc(events.startsAt))
    .limit(200);
}

export type EventInput = { title: string; description: string | null; location: string | null; startsAt: string; endsAt: string | null; unitId: string | null; announcementId: string | null };

export async function saveEvent(ctx: Ctx, id: string | null, input: EventInput) {
  requirePermission(ctx.actor, "announcement:manage");
  const db = getDb();
  const startsAt = new Date(input.startsAt);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (endsAt && endsAt < startsAt) throw validation("O término deve ser depois do início.", { endsAt: ["Ajuste o horário de término."] });
  if (input.unitId && !(await db.select({ id: units.id }).from(units).where(eq(units.id, input.unitId))).length) throw validation("Unidade inválida.", { unitId: ["Escolha uma unidade."] });
  if (input.announcementId && !(await db.select({ id: announcements.id }).from(announcements).where(eq(announcements.id, input.announcementId))).length) throw validation("Comunicado inválido.");
  const values = { title: input.title.trim(), description: input.description?.trim() || null, location: input.location?.trim() || null, startsAt, endsAt, unitId: input.unitId || null, announcementId: input.announcementId || null };
  const [row] = id ? await db.update(events).set(values).where(eq(events.id, id)).returning({ id: events.id }) : await db.insert(events).values(values).returning({ id: events.id });
  if (!row) throw notFound("Evento");
  await audit({ action: "event.saved", actorUserId: ctx.actor.userId, entityType: "event", entityId: row.id, meta: ctx.meta });
  return row;
}

export async function setEventStatus(ctx: Ctx, id: string, status: "scheduled" | "cancelled") {
  requirePermission(ctx.actor, "announcement:manage");
  const rows = await getDb().update(events).set({ status }).where(eq(events.id, id)).returning({ id: events.id });
  if (!rows.length) throw notFound("Evento");
  await audit({ action: "event.status_changed", actorUserId: ctx.actor.userId, entityType: "event", entityId: id, metadata: { status }, meta: ctx.meta });
}

/** Comunicados publicados recentes, para vincular a um evento ("Saiba mais"). */
export async function announcementLinkOptions() {
  return getDb()
    .select({ id: announcements.id, title: announcements.title })
    .from(announcements)
    .where(or(eq(announcements.status, "published"), eq(announcements.status, "scheduled")))
    .orderBy(desc(sql`coalesce(${announcements.publishedAt}, ${announcements.publishAt})`))
    .limit(50);
}
