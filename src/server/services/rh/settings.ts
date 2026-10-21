import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { slaCalendars, slaHolidays, slaPolicies, ticketCategories, ticketPriority, type TicketPriority, type WorkingHours } from "../../db/schema";
import { notFound, validation } from "../../errors";
import { invalidateCalendar } from "../tickets";
import { slugify } from "./courses";

export const PRIORITIES = ticketPriority.enumValues;

// ── Áreas de atendimento (categorias de solicitação) ─────────────────────────

export async function listTicketCategoriesAdmin(ctx: Ctx) {
  requirePermission(ctx.actor, "sla:configure");
  return getDb().select().from(ticketCategories).orderBy(asc(ticketCategories.position));
}

export async function saveTicketCategory(
  ctx: Ctx,
  id: string | null,
  input: { name: string; description: string; color: string; icon: string; defaultPriority: TicketPriority; active: boolean },
) {
  requirePermission(ctx.actor, "sla:configure");
  const db = getDb();
  const values = { name: input.name.trim(), description: input.description.trim(), color: input.color, icon: input.icon, defaultPriority: input.defaultPriority, active: input.active };
  let row: { id: string } | undefined;
  if (id) {
    [row] = await db.update(ticketCategories).set(values).where(eq(ticketCategories.id, id)).returning({ id: ticketCategories.id });
  } else {
    const slug = slugify(input.name);
    if ((await db.select({ id: ticketCategories.id }).from(ticketCategories).where(eq(ticketCategories.slug, slug))).length) throw validation("Já existe uma área com este nome.", { name: ["Use outro nome."] });
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${ticketCategories.position}),0)`.mapWith(Number) }).from(ticketCategories);
    [row] = await db.insert(ticketCategories).values({ ...values, slug, position: max + 1 }).returning({ id: ticketCategories.id });
  }
  if (!row) throw notFound("Área");
  await audit({ action: "settings.ticket_category_saved", actorUserId: ctx.actor.userId, entityType: "ticket_category", entityId: row.id, meta: ctx.meta });
  return row;
}

// ── Prazos (SLA) por área × prioridade ───────────────────────────────────────

export async function slaMatrix(ctx: Ctx) {
  requirePermission(ctx.actor, "sla:configure");
  const db = getDb();
  const [cats, policies, [calendar]] = await Promise.all([
    db.select().from(ticketCategories).orderBy(asc(ticketCategories.position)),
    db.select().from(slaPolicies).where(isNull(slaPolicies.supersededAt)),
    db.select().from(slaCalendars).orderBy(asc(slaCalendars.createdAt)).limit(1),
  ]);
  const perDay = calendar ? minutesPerDay(calendar.workingHours) : 600;
  return {
    calendar,
    minutesPerDay: perDay,
    rows: cats.map((c) => ({
      category: c,
      cells: PRIORITIES.map((p) => {
        const pol = policies.find((x) => x.categoryId === c.id && x.priority === p);
        return { priority: p, policy: pol ? { id: pol.id, firstResponseMinutes: pol.firstResponseMinutes, resolutionMinutes: pol.resolutionMinutes, warnAtPercent: pol.warnAtPercent } : null };
      }),
    })),
  };
}

function minutesPerDay(wh: WorkingHours) {
  const day = Object.values(wh).find((s) => (s ?? []).length) ?? [];
  return day.reduce((n, [a, b]) => n + toMin(b) - toMin(a), 0) || 600;
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Nova versão da política (a anterior é preservada com `superseded_at`). Vale para solicitações abertas
 * a partir de agora; as já abertas mantêm o prazo calculado na abertura.
 */
export async function saveSlaPolicy(ctx: Ctx, input: { categoryId: string; priority: TicketPriority; firstResponseMinutes: number; resolutionMinutes: number; warnAtPercent: number }) {
  requirePermission(ctx.actor, "sla:configure");
  if (input.firstResponseMinutes > input.resolutionMinutes) throw validation("A primeira resposta deve vir antes da resolução.", { firstResponseMinutes: ["Use um prazo menor ou igual ao de resolução."] });
  const db = getDb();
  return db.transaction(async (tx) => {
    const [cat] = await tx.select().from(ticketCategories).where(eq(ticketCategories.id, input.categoryId));
    if (!cat) throw notFound("Área");
    const [calendar] = await tx.select().from(slaCalendars).orderBy(asc(slaCalendars.createdAt)).limit(1);
    if (!calendar) throw validation("Configure o calendário de atendimento antes.");
    await tx.update(slaPolicies).set({ supersededAt: new Date() }).where(and(eq(slaPolicies.categoryId, input.categoryId), eq(slaPolicies.priority, input.priority), isNull(slaPolicies.supersededAt)));
    const [row] = await tx
      .insert(slaPolicies)
      .values({ categoryId: input.categoryId, priority: input.priority, calendarId: calendar.id, firstResponseMinutes: input.firstResponseMinutes, resolutionMinutes: input.resolutionMinutes, warnAtPercent: input.warnAtPercent, createdByUserId: ctx.actor.userId })
      .returning({ id: slaPolicies.id });
    await audit({ action: "settings.sla_policy_saved", actorUserId: ctx.actor.userId, entityType: "sla_policy", entityId: row.id, metadata: { category: cat.slug, priority: input.priority, first: input.firstResponseMinutes, resolution: input.resolutionMinutes }, meta: ctx.meta }, tx);
    return row;
  });
}

// ── Calendário de atendimento e feriados ─────────────────────────────────────

export async function calendarSettings(ctx: Ctx) {
  requirePermission(ctx.actor, "sla:configure");
  const db = getDb();
  const [calendar] = await db.select().from(slaCalendars).orderBy(asc(slaCalendars.createdAt)).limit(1);
  if (!calendar) return null;
  const holidays = await db
    .select()
    .from(slaHolidays)
    .where(and(eq(slaHolidays.calendarId, calendar.id), gte(slaHolidays.date, sql`(current_date - interval '1 year')::date`)))
    .orderBy(asc(slaHolidays.date));
  return { ...calendar, holidays };
}

/** Expediente por dia da semana ("0" = domingo). Dias sem faixa = sem atendimento. */
export async function saveWorkingHours(ctx: Ctx, workingHours: WorkingHours) {
  requirePermission(ctx.actor, "sla:configure");
  for (const [day, slots] of Object.entries(workingHours)) {
    for (const [a, b] of slots ?? []) if (toMin(b) <= toMin(a)) throw validation(`Horário inválido no dia ${day}: o fim deve ser depois do início.`);
  }
  if (!Object.values(workingHours).some((s) => (s ?? []).length)) throw validation("Defina ao menos um dia de atendimento.");
  const db = getDb();
  const [calendar] = await db.select().from(slaCalendars).orderBy(asc(slaCalendars.createdAt)).limit(1);
  if (!calendar) throw notFound("Calendário");
  await db.update(slaCalendars).set({ workingHours, updatedAt: new Date() }).where(eq(slaCalendars.id, calendar.id));
  invalidateCalendar(calendar.id);
  await audit({ action: "settings.calendar_saved", actorUserId: ctx.actor.userId, entityType: "sla_calendar", entityId: calendar.id, meta: ctx.meta });
}

export async function addHoliday(ctx: Ctx, input: { date: string; name: string }) {
  requirePermission(ctx.actor, "sla:configure");
  const db = getDb();
  const [calendar] = await db.select().from(slaCalendars).orderBy(asc(slaCalendars.createdAt)).limit(1);
  if (!calendar) throw notFound("Calendário");
  const [row] = await db.insert(slaHolidays).values({ calendarId: calendar.id, date: input.date, name: input.name.trim() }).onConflictDoNothing().returning({ id: slaHolidays.id });
  if (!row) throw validation("Já existe um feriado nesta data.", { date: ["Data já cadastrada."] });
  invalidateCalendar(calendar.id);
  await audit({ action: "settings.holiday_saved", actorUserId: ctx.actor.userId, entityType: "sla_holiday", entityId: row.id, metadata: { date: input.date }, meta: ctx.meta });
  return row;
}

export async function deleteHoliday(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "sla:configure");
  const [row] = await getDb().delete(slaHolidays).where(eq(slaHolidays.id, id)).returning();
  if (!row) throw notFound("Feriado");
  invalidateCalendar(row.calendarId);
  await audit({ action: "settings.holiday_deleted", actorUserId: ctx.actor.userId, entityType: "sla_holiday", entityId: id, metadata: { date: row.date }, meta: ctx.meta });
}

/** Histórico de versões de uma política (para transparência das mudanças de prazo). */
export async function slaHistory(ctx: Ctx, categoryId: string) {
  requirePermission(ctx.actor, "sla:configure");
  return getDb().select().from(slaPolicies).where(eq(slaPolicies.categoryId, categoryId)).orderBy(asc(slaPolicies.priority), desc(slaPolicies.createdAt));
}
