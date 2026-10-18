import { and, asc, count, desc, eq, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { audit } from "../audit";
import { requireEmployee, requirePermission, type Actor, type Ctx } from "../auth/actor";
import { getDb, type Executor } from "../db/client";
import {
  employees,
  fileAssets,
  slaCalendars,
  slaHolidays,
  slaPolicies,
  ticketAttachments,
  ticketCategories,
  ticketDrafts,
  ticketEvents,
  ticketMessages,
  ticketParticipants,
  tickets,
  users,
  type TicketPriority,
  type TicketStatus,
} from "../db/schema";
import { conflict, forbidden, invalidTransition, notFound, validation } from "../errors";
import { storeUpload } from "../files/storage";
import { logger } from "../logger";
import { addBusinessMinutes, businessMinutesBetween, isWithinBusinessHours, type BusinessCalendar } from "../sla/business-time";
import { computeSlaView, shiftDueAfterPause } from "../sla/ticket-sla";
import { canTransition, REOPEN_WINDOW_DAYS, statusAfterRequesterReply, type TicketActorKind } from "../tickets/state-machine";
import { textSearch, ref } from "./audience";
import { notify } from "./notifications";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  aguardando_colaborador: "Aguardando você",
  respondido: "Respondido",
  resolvido: "Resolvido",
  fechado: "Concluído",
  cancelado: "Cancelado",
};

export type TicketTab = "todos" | "andamento" | "aguardando" | "respondidos" | "concluidos";
const TAB_STATUSES: Record<Exclude<TicketTab, "todos">, TicketStatus[]> = {
  andamento: ["aberto", "em_andamento"],
  aguardando: ["aguardando_colaborador"],
  respondidos: ["respondido"],
  concluidos: ["resolvido", "fechado", "cancelado"],
};

const MAX_ATTACHMENTS = 5;

// ── Calendário/SLA ────────────────────────────────────────────────────────────

type CalendarCacheEntry = { at: number; cal: BusinessCalendar };
const calendarCache = new Map<string, CalendarCacheEntry>();

export async function loadCalendar(calendarId: string, db: Executor = getDb()): Promise<BusinessCalendar | null> {
  const cached = calendarCache.get(calendarId);
  if (cached && Date.now() - cached.at < 60_000) return cached.cal;
  const [row] = await db.select().from(slaCalendars).where(eq(slaCalendars.id, calendarId));
  if (!row) return null;
  const hol = await db.select({ date: slaHolidays.date }).from(slaHolidays).where(eq(slaHolidays.calendarId, calendarId));
  const cal = { timezone: row.timezone, workingHours: row.workingHours, holidays: new Set(hol.map((h) => h.date)) };
  calendarCache.set(calendarId, { at: Date.now(), cal });
  return cal;
}

export async function defaultCalendar() {
  const [row] = await getDb().select().from(slaCalendars).orderBy(asc(slaCalendars.createdAt)).limit(1);
  if (!row) return null;
  return { name: row.name, workingHours: row.workingHours, timezone: row.timezone, calendar: await loadCalendar(row.id) };
}

/** "Horário de atendimento" exibido na Ajuda (derivado do calendário configurado, nunca fixo no código). */
export async function supportHours(now = new Date()) {
  const def = await defaultCalendar();
  if (!def?.calendar) return null;
  const days = Object.entries(def.workingHours).filter(([, s]) => (s ?? []).length > 0);
  const weekdayNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const first = days[0];
  const sameHours = days.every(([, s]) => JSON.stringify(s) === JSON.stringify(first?.[1]));
  const label =
    first && sameHours
      ? `${weekdayNames[Number(days[0][0])].replace(/^./, (c) => c.toUpperCase())} a ${weekdayNames[Number(days[days.length - 1][0])]}`
      : "Conforme calendário";
  const hours = first && sameHours ? (first[1] ?? []).map(([s, e]) => `${s.replace(":00", "h")} às ${e.replace(":00", "h")}`).join(", ") : "";
  return { label, hours, online: isWithinBusinessHours(now, def.calendar) };
}

async function activePolicy(categoryId: string, priority: TicketPriority, db: Executor) {
  const [p] = await db
    .select()
    .from(slaPolicies)
    .where(and(eq(slaPolicies.categoryId, categoryId), eq(slaPolicies.priority, priority), isNull(slaPolicies.supersededAt)))
    .limit(1);
  return p ?? null;
}

// ── Acesso ────────────────────────────────────────────────────────────────────

/** Ticket visível ao colaborador: é o solicitante ou foi explicitamente compartilhado com ele. */
function requesterScope(actor: Actor): SQL {
  const e = actor.employee;
  const participant = sql`EXISTS (SELECT 1 FROM ${ticketParticipants} p WHERE p.ticket_id = ${ref(tickets.id)} AND p.user_id = ${actor.userId})`;
  return e ? or(eq(tickets.requesterEmployeeId, e.id), participant)! : participant;
}

async function findTicketForRequester(ctx: Ctx, number: number, db: Executor = getDb()) {
  requirePermission(ctx.actor, "ticket:read:own");
  const [row] = await db.select().from(tickets).where(and(eq(tickets.number, number), requesterScope(ctx.actor))).limit(1);
  if (!row) throw notFound("Solicitação");
  return row;
}

const listFields = {
  id: tickets.id,
  number: tickets.number,
  subject: tickets.subject,
  status: tickets.status,
  priority: tickets.priority,
  createdAt: tickets.createdAt,
  updatedAt: tickets.updatedAt,
  resolutionDueAt: tickets.resolutionDueAt,
  firstResponseDueAt: tickets.firstResponseDueAt,
  firstRespondedAt: tickets.firstRespondedAt,
  resolvedAt: tickets.resolvedAt,
  pausedAt: tickets.pausedAt,
  pausedBusinessMinutes: tickets.pausedBusinessMinutes,
  resolutionMinutes: slaPolicies.resolutionMinutes,
  calendarId: slaPolicies.calendarId,
  category: { slug: ticketCategories.slug, name: ticketCategories.name, color: ticketCategories.color, icon: ticketCategories.icon },
};

async function withSla<T extends { calendarId: string | null; status: TicketStatus; createdAt: Date; resolutionMinutes: number | null; resolutionDueAt: Date | null; firstResponseDueAt: Date | null; firstRespondedAt: Date | null; resolvedAt: Date | null; pausedAt: Date | null; pausedBusinessMinutes: number }>(rows: T[], now = new Date()) {
  const out = [];
  for (const r of rows) {
    const cal = r.calendarId ? await loadCalendar(r.calendarId) : null;
    out.push({ ...r, sla: computeSlaView(r, cal, now) });
  }
  return out;
}

export async function listMyTickets(ctx: Ctx, opts: { tab?: TicketTab; q?: string; category?: string; page?: number; pageSize?: number } = {}) {
  requirePermission(ctx.actor, "ticket:read:own");
  const tab = opts.tab ?? "todos";
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;
  const qNumber = opts.q?.replace(/^#/, "").trim();
  const search = opts.q
    ? or(textSearch([tickets.subject], opts.q), /^\d{1,9}$/.test(qNumber ?? "") ? eq(tickets.number, Number(qNumber)) : undefined)
    : undefined;
  const base = and(requesterScope(ctx.actor), search, opts.category ? eq(ticketCategories.slug, opts.category) : undefined);
  const where = and(base, tab === "todos" ? undefined : inArray(tickets.status, TAB_STATUSES[tab]));
  const db = getDb();
  const [rows, [{ total }], [counts]] = await Promise.all([
    db
      .select(listFields)
      .from(tickets)
      .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .leftJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
      .where(where)
      .orderBy(sql`CASE WHEN ${tickets.status} IN ('resolvido','fechado','cancelado') THEN 1 ELSE 0 END`, desc(tickets.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(tickets).innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId)).where(where),
    db
      .select({
        todos: count(),
        andamento: sql<number>`count(*) FILTER (WHERE ${tickets.status} IN ('aberto','em_andamento'))`.mapWith(Number),
        aguardando: sql<number>`count(*) FILTER (WHERE ${tickets.status} = 'aguardando_colaborador')`.mapWith(Number),
        respondidos: sql<number>`count(*) FILTER (WHERE ${tickets.status} = 'respondido')`.mapWith(Number),
        concluidos: sql<number>`count(*) FILTER (WHERE ${tickets.status} IN ('resolvido','fechado','cancelado'))`.mapWith(Number),
      })
      .from(tickets)
      .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .where(base),
  ]);
  return { items: await withSla(rows), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts };
}

export async function openTicketsSummary(ctx: Ctx, limit = 3) {
  requirePermission(ctx.actor, "ticket:read:own");
  const rows = await getDb()
    .select(listFields)
    .from(tickets)
    .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
    .leftJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
    .where(and(requesterScope(ctx.actor), inArray(tickets.status, ["aberto", "em_andamento", "aguardando_colaborador", "respondido"])))
    .orderBy(sql`CASE WHEN ${tickets.status} = 'aguardando_colaborador' THEN 0 ELSE 1 END`, desc(tickets.updatedAt))
    .limit(limit);
  return withSla(rows);
}

export async function awaitingMeCount(ctx: Ctx) {
  requirePermission(ctx.actor, "ticket:read:own");
  const [row] = await getDb()
    .select({ n: count() })
    .from(tickets)
    .where(and(requesterScope(ctx.actor), inArray(tickets.status, ["aguardando_colaborador", "respondido"])));
  return row.n;
}

export async function getMyTicket(ctx: Ctx, number: number) {
  const t = await findTicketForRequester(ctx, number);
  const db = getDb();
  const [[meta], messages, attachments, events] = await Promise.all([
    db
      .select({
        category: { slug: ticketCategories.slug, name: ticketCategories.name, color: ticketCategories.color, icon: ticketCategories.icon },
        resolutionMinutes: slaPolicies.resolutionMinutes,
        calendarId: slaPolicies.calendarId,
        requesterName: employees.fullName,
        assigneeEmail: users.email,
      })
      .from(tickets)
      .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .innerJoin(employees, eq(employees.id, tickets.requesterEmployeeId))
      .leftJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
      .leftJoin(users, eq(users.id, tickets.assigneeUserId))
      .where(eq(tickets.id, t.id)),
    db
      .select({ id: ticketMessages.id, body: ticketMessages.body, createdAt: ticketMessages.createdAt, authorUserId: ticketMessages.authorUserId, authorName: employees.fullName })
      .from(ticketMessages)
      .leftJoin(employees, eq(employees.userId, ticketMessages.authorUserId))
      // Notas internas da equipe nunca chegam ao solicitante.
      .where(and(eq(ticketMessages.ticketId, t.id), eq(ticketMessages.isInternal, false)))
      .orderBy(asc(ticketMessages.createdAt)),
    db
      .select({ id: ticketAttachments.id, messageId: ticketAttachments.messageId, name: fileAssets.originalName, sizeBytes: fileAssets.sizeBytes, mimeType: fileAssets.mimeType, createdAt: ticketAttachments.createdAt })
      .from(ticketAttachments)
      .innerJoin(fileAssets, eq(fileAssets.id, ticketAttachments.fileId))
      .where(eq(ticketAttachments.ticketId, t.id))
      .orderBy(asc(ticketAttachments.createdAt)),
    db
      .select({ type: ticketEvents.type, fromValue: ticketEvents.fromValue, toValue: ticketEvents.toValue, createdAt: ticketEvents.createdAt, note: ticketEvents.note })
      .from(ticketEvents)
      .where(and(eq(ticketEvents.ticketId, t.id), inArray(ticketEvents.type, ["created", "status_changed", "assigned", "priority_changed", "sla_paused", "sla_resumed"])))
      .orderBy(asc(ticketEvents.createdAt)),
  ]);
  const cal = meta.calendarId ? await loadCalendar(meta.calendarId) : null;
  const sla = computeSlaView({ ...t, resolutionMinutes: meta.resolutionMinutes }, cal, new Date());
  const isRequester = t.requesterEmployeeId === ctx.actor.employee?.id;
  const reopenUntil = t.resolvedAt ? new Date(t.resolvedAt.getTime() + REOPEN_WINDOW_DAYS * 86400_000) : null;
  return {
    id: t.id,
    number: t.number,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    resolvedAt: t.resolvedAt,
    version: t.version,
    category: meta.category,
    requesterName: meta.requesterName,
    hasAssignee: !!t.assigneeUserId,
    sla,
    messages: messages.map((m) => ({ ...m, mine: m.authorUserId === ctx.actor.userId, authorName: m.authorUserId === ctx.actor.userId ? "Você" : (m.authorName ?? "Equipe de atendimento") })),
    attachments,
    events,
    actions: {
      canReply: isRequester && statusAfterRequesterReply(t.status) !== null && t.status !== "resolvido",
      canCancel: isRequester && canTransition(t.status, "cancelado", "requester"),
      canConfirm: isRequester && (t.status === "respondido" || t.status === "resolvido"),
      canReopen: isRequester && t.status === "resolvido" && !!reopenUntil && reopenUntil > new Date(),
    },
  };
}

// ── Criação e interação do solicitante ───────────────────────────────────────

export async function listTicketCategories() {
  return getDb()
    .select({ id: ticketCategories.id, slug: ticketCategories.slug, name: ticketCategories.name, description: ticketCategories.description, color: ticketCategories.color, icon: ticketCategories.icon })
    .from(ticketCategories)
    .where(eq(ticketCategories.active, true))
    .orderBy(asc(ticketCategories.position));
}

type UploadFile = { name: string; bytes: Uint8Array };

async function attachFiles(tx: Executor, ctx: Ctx, ticketId: string, messageId: string | null, files: UploadFile[]) {
  for (const f of files) {
    const asset = await storeUpload(f, ctx.actor.userId, tx);
    await tx.insert(ticketAttachments).values({ ticketId, messageId, fileId: asset.id, uploadedByUserId: ctx.actor.userId });
  }
}

export async function createTicket(
  ctx: Ctx,
  input: { categorySlug: string; subject: string; description: string; files?: UploadFile[]; draftId?: string },
) {
  requirePermission(ctx.actor, "ticket:create");
  const e = requireEmployee(ctx.actor);
  if ((input.files?.length ?? 0) > MAX_ATTACHMENTS) throw validation(`Anexe no máximo ${MAX_ATTACHMENTS} arquivos.`);
  const db = getDb();
  const [cat] = await db.select().from(ticketCategories).where(and(eq(ticketCategories.slug, input.categorySlug), eq(ticketCategories.active, true)));
  if (!cat) throw validation("Verifique os campos.", { categorySlug: ["Escolha uma categoria válida."] });

  const created = await db.transaction(async (tx) => {
    const now = new Date();
    const priority = cat.defaultPriority;
    const policy = await activePolicy(cat.id, priority, tx);
    const cal = policy ? await loadCalendar(policy.calendarId, tx) : null;
    const [t] = await tx
      .insert(tickets)
      .values({
        requesterEmployeeId: e.id,
        categoryId: cat.id,
        subject: input.subject,
        description: input.description,
        priority,
        slaPolicyId: policy?.id ?? null,
        firstResponseDueAt: policy && cal ? addBusinessMinutes(now, policy.firstResponseMinutes, cal) : null,
        resolutionDueAt: policy && cal ? addBusinessMinutes(now, policy.resolutionMinutes, cal) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(ticketEvents).values({ ticketId: t.id, type: "created", toValue: "aberto", actorUserId: ctx.actor.userId });
    if (input.files?.length) await attachFiles(tx, ctx, t.id, null, input.files);
    if (input.draftId) await tx.delete(ticketDrafts).where(and(eq(ticketDrafts.id, input.draftId), eq(ticketDrafts.employeeId, e.id)));
    await audit({ action: "ticket.created", actorUserId: ctx.actor.userId, entityType: "ticket", entityId: t.id, metadata: { number: t.number, category: cat.slug, attachments: input.files?.length ?? 0 }, meta: ctx.meta }, tx);
    if (!policy) logger.warn("ticket.no_sla_policy", { category: cat.slug, priority });
    return t;
  });
  return { id: created.id, number: created.number, status: created.status, resolutionDueAt: created.resolutionDueAt };
}

/**
 * Transição com controle otimista: aplica somente se o status/versão não mudou desde a leitura.
 * Mantém relógio de SLA (pausa/retomada) e registra eventos de histórico.
 */
async function transition(
  tx: Executor,
  ticket: typeof tickets.$inferSelect,
  to: TicketStatus,
  who: TicketActorKind,
  actorUserId: string | null,
  note?: string,
) {
  if (!canTransition(ticket.status, to, who)) throw invalidTransition(`Não é possível mudar de "${STATUS_LABEL[ticket.status]}" para "${STATUS_LABEL[to]}".`);
  const now = new Date();
  const policy = ticket.slaPolicyId ? (await tx.select().from(slaPolicies).where(eq(slaPolicies.id, ticket.slaPolicyId)))[0] : null;
  const cal = policy ? await loadCalendar(policy.calendarId, tx) : null;
  const pauses = policy?.pauseStatuses ?? [];
  const patch: Partial<typeof tickets.$inferInsert> = { status: to, updatedAt: now };
  const extraEvents: Array<typeof ticketEvents.$inferInsert> = [];

  const wasPaused = !!ticket.pausedAt;
  const willPause = pauses.includes(to);
  if (!wasPaused && willPause) {
    patch.pausedAt = now;
    extraEvents.push({ ticketId: ticket.id, type: "sla_paused", actorUserId });
  } else if (wasPaused && !willPause) {
    patch.pausedAt = null;
    if (cal && ticket.resolutionDueAt) {
      const shifted = shiftDueAfterPause(ticket.resolutionDueAt, ticket.pausedAt!, now, cal);
      patch.resolutionDueAt = shifted.dueAt;
      patch.pausedBusinessMinutes = ticket.pausedBusinessMinutes + shifted.pausedMinutes;
    }
    extraEvents.push({ ticketId: ticket.id, type: "sla_resumed", actorUserId });
  }
  if (to === "resolvido") patch.resolvedAt = now;
  if (to === "fechado") patch.closedAt = now;
  if (to === "cancelado") patch.cancelledAt = now;
  if (to === "em_andamento" && (ticket.status === "resolvido" || ticket.status === "respondido")) patch.resolvedAt = null;

  const [updated] = await tx
    .update(tickets)
    .set({ ...patch, version: sql`${tickets.version} + 1` })
    .where(and(eq(tickets.id, ticket.id), eq(tickets.version, ticket.version)))
    .returning();
  if (!updated) throw conflict("A solicitação foi atualizada por outra pessoa. Recarregue a página e tente novamente.");
  await tx.insert(ticketEvents).values([{ ticketId: ticket.id, type: "status_changed", fromValue: ticket.status, toValue: to, actorUserId, note: note ?? null }, ...extraEvents]);
  await audit({ action: "ticket.status_changed", actorUserId, entityType: "ticket", entityId: ticket.id, metadata: { from: ticket.status, to, by: who } }, tx);
  return updated;
}

export async function addRequesterMessage(ctx: Ctx, number: number, input: { body: string; files?: UploadFile[] }) {
  requirePermission(ctx.actor, "ticket:comment:own");
  if ((input.files?.length ?? 0) > MAX_ATTACHMENTS) throw validation(`Anexe no máximo ${MAX_ATTACHMENTS} arquivos.`);
  const db = getDb();
  return db.transaction(async (tx) => {
    const t = await findTicketForRequester(ctx, number, tx);
    if (t.requesterEmployeeId !== ctx.actor.employee?.id) throw forbidden();
    const next = statusAfterRequesterReply(t.status);
    if (next === null || t.status === "resolvido") throw invalidTransition("Esta solicitação está encerrada e não aceita novas mensagens.");
    const [msg] = await tx.insert(ticketMessages).values({ ticketId: t.id, authorUserId: ctx.actor.userId, body: input.body }).returning();
    if (input.files?.length) await attachFiles(tx, ctx, t.id, msg.id, input.files);
    await tx.insert(ticketEvents).values({ ticketId: t.id, type: "message_added", actorUserId: ctx.actor.userId });
    if (next !== t.status) {
      await transition(tx, t, next, "requester", ctx.actor.userId, "Resposta do colaborador");
    } else {
      await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, t.id));
    }
    await audit({ action: "ticket.message_added", actorUserId: ctx.actor.userId, entityType: "ticket", entityId: t.id, metadata: { attachments: input.files?.length ?? 0 }, meta: ctx.meta }, tx);
    if (t.assigneeUserId) await notify([t.assigneeUserId], { category: "solicitacoes", title: `Nova mensagem na solicitação #${t.number}`, link: `/rh/solicitacoes/${t.number}`, entityType: "ticket", entityId: t.id }, tx);
    return { messageId: msg.id };
  });
}

export async function cancelMyTicket(ctx: Ctx, number: number, reason?: string) {
  requirePermission(ctx.actor, "ticket:comment:own");
  await getDb().transaction(async (tx) => {
    const t = await findTicketForRequester(ctx, number, tx);
    if (t.requesterEmployeeId !== ctx.actor.employee?.id) throw forbidden();
    await transition(tx, t, "cancelado", "requester", ctx.actor.userId, reason || "Cancelado pelo colaborador");
  });
}

/** Colaborador confirma a solução: respondido → resolvido; resolvido → fechado. */
export async function confirmResolution(ctx: Ctx, number: number) {
  requirePermission(ctx.actor, "ticket:comment:own");
  await getDb().transaction(async (tx) => {
    const t = await findTicketForRequester(ctx, number, tx);
    if (t.requesterEmployeeId !== ctx.actor.employee?.id) throw forbidden();
    const to: TicketStatus = t.status === "respondido" ? "resolvido" : "fechado";
    let current = t;
    current = await transition(tx, current, to, "requester", ctx.actor.userId, "Solução confirmada pelo colaborador");
    if (to === "resolvido") await transition(tx, current, "fechado", "requester", ctx.actor.userId, "Encerrado após confirmação");
  });
}

export async function reopenMyTicket(ctx: Ctx, number: number, body: string) {
  requirePermission(ctx.actor, "ticket:comment:own");
  await getDb().transaction(async (tx) => {
    const t = await findTicketForRequester(ctx, number, tx);
    if (t.requesterEmployeeId !== ctx.actor.employee?.id) throw forbidden();
    if (t.status !== "resolvido" || !t.resolvedAt || t.resolvedAt.getTime() + REOPEN_WINDOW_DAYS * 86400_000 < Date.now()) {
      throw invalidTransition(`Só é possível reabrir em até ${REOPEN_WINDOW_DAYS} dias após a resolução. Abra uma nova solicitação.`);
    }
    await tx.insert(ticketMessages).values({ ticketId: t.id, authorUserId: ctx.actor.userId, body });
    await transition(tx, t, "em_andamento", "requester", ctx.actor.userId, "Reaberto pelo colaborador");
  });
}

export async function openTicketAttachment(ctx: Ctx, number: number, attachmentId: string) {
  const t = await findTicketForRequester(ctx, number);
  const [row] = await getDb()
    .select({ asset: fileAssets, isInternal: ticketMessages.isInternal })
    .from(ticketAttachments)
    .innerJoin(fileAssets, eq(fileAssets.id, ticketAttachments.fileId))
    .leftJoin(ticketMessages, eq(ticketMessages.id, ticketAttachments.messageId))
    .where(and(eq(ticketAttachments.id, attachmentId), eq(ticketAttachments.ticketId, t.id)));
  if (!row || row.isInternal) throw notFound("Anexo");
  await audit({ action: "ticket.attachment_downloaded", actorUserId: ctx.actor.userId, entityType: "ticket", entityId: t.id, metadata: { attachmentId }, meta: ctx.meta });
  return row.asset;
}

// ── Rascunhos ────────────────────────────────────────────────────────────────

export async function listDrafts(ctx: Ctx) {
  requirePermission(ctx.actor, "ticket:create");
  const e = requireEmployee(ctx.actor);
  return getDb()
    .select({ id: ticketDrafts.id, subject: ticketDrafts.subject, description: ticketDrafts.description, updatedAt: ticketDrafts.updatedAt, category: { slug: ticketCategories.slug, name: ticketCategories.name, color: ticketCategories.color, icon: ticketCategories.icon } })
    .from(ticketDrafts)
    .leftJoin(ticketCategories, eq(ticketCategories.id, ticketDrafts.categoryId))
    .where(eq(ticketDrafts.employeeId, e.id))
    .orderBy(desc(ticketDrafts.updatedAt));
}

export async function getDraft(ctx: Ctx, id: string) {
  const drafts = await listDrafts(ctx);
  const d = drafts.find((x) => x.id === id);
  if (!d) throw notFound("Rascunho");
  return d;
}

export async function saveDraft(ctx: Ctx, input: { id?: string; categorySlug?: string; subject: string; description: string }) {
  requirePermission(ctx.actor, "ticket:create");
  const e = requireEmployee(ctx.actor);
  const db = getDb();
  const cat = input.categorySlug ? (await db.select().from(ticketCategories).where(eq(ticketCategories.slug, input.categorySlug)))[0] : undefined;
  if (input.id) {
    const [row] = await db
      .update(ticketDrafts)
      .set({ categoryId: cat?.id ?? null, subject: input.subject, description: input.description, updatedAt: new Date() })
      .where(and(eq(ticketDrafts.id, input.id), eq(ticketDrafts.employeeId, e.id)))
      .returning({ id: ticketDrafts.id });
    if (!row) throw notFound("Rascunho");
    return row;
  }
  const [{ n }] = await db.select({ n: count() }).from(ticketDrafts).where(eq(ticketDrafts.employeeId, e.id));
  if (n >= 20) throw validation("Você atingiu o limite de 20 rascunhos. Exclua algum para salvar um novo.");
  const [row] = await db.insert(ticketDrafts).values({ employeeId: e.id, categoryId: cat?.id ?? null, subject: input.subject, description: input.description }).returning({ id: ticketDrafts.id });
  return row;
}

export async function deleteDraft(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "ticket:create");
  const e = requireEmployee(ctx.actor);
  const rows = await getDb().delete(ticketDrafts).where(and(eq(ticketDrafts.id, id), eq(ticketDrafts.employeeId, e.id))).returning({ id: ticketDrafts.id });
  if (!rows.length) throw notFound("Rascunho");
}

// ── Atendimento (usado pelo ambiente RH na próxima fase; já coberto por testes) ──

async function findTicketForAgent(ctx: Ctx, number: number, tx: Executor) {
  requirePermission(ctx.actor, "ticket:manage");
  const [t] = await tx.select().from(tickets).where(eq(tickets.number, number)).limit(1);
  if (!t) throw notFound("Solicitação");
  return t;
}

async function requesterUserId(tx: Executor, employeeId: string) {
  const [row] = await tx.select({ userId: employees.userId }).from(employees).where(eq(employees.id, employeeId));
  return row?.userId;
}

export async function agentReply(ctx: Ctx, number: number, input: { body: string; internal?: boolean; setStatus?: TicketStatus }) {
  await getDb().transaction(async (tx) => {
    const t = await findTicketForAgent(ctx, number, tx);
    await tx.insert(ticketMessages).values({ ticketId: t.id, authorUserId: ctx.actor.userId, body: input.body, isInternal: !!input.internal });
    let current = t;
    if (!input.internal && !t.firstRespondedAt) {
      const [u] = await tx.update(tickets).set({ firstRespondedAt: new Date() }).where(eq(tickets.id, t.id)).returning();
      current = u;
    }
    if (input.setStatus && input.setStatus !== current.status) current = await transition(tx, current, input.setStatus, "agent", ctx.actor.userId);
    if (!input.internal) {
      const uid = await requesterUserId(tx, t.requesterEmployeeId);
      const statusText = input.setStatus === "aguardando_colaborador" ? "aguarda sua resposta" : "foi atualizada";
      if (uid) await notify([uid], { category: "solicitacoes", title: `Solicitação ${String(t.number).padStart(4, "0")} ${statusText}`, link: `/solicitacoes/${t.number}`, entityType: "ticket", entityId: t.id }, tx);
    }
  });
}

export async function agentChangeStatus(ctx: Ctx, number: number, to: TicketStatus, note?: string) {
  await getDb().transaction(async (tx) => {
    const t = await findTicketForAgent(ctx, number, tx);
    await transition(tx, t, to, "agent", ctx.actor.userId, note);
    const uid = await requesterUserId(tx, t.requesterEmployeeId);
    if (uid) await notify([uid], { category: "solicitacoes", title: `Solicitação #${t.number}: ${STATUS_LABEL[to]}`, link: `/solicitacoes/${t.number}`, entityType: "ticket", entityId: t.id }, tx);
  });
}

export async function agentAssign(ctx: Ctx, number: number, assigneeUserId: string) {
  await getDb().transaction(async (tx) => {
    const t = await findTicketForAgent(ctx, number, tx);
    const [updated] = await tx
      .update(tickets)
      .set({ assigneeUserId, updatedAt: new Date(), version: sql`${tickets.version} + 1` })
      .where(and(eq(tickets.id, t.id), eq(tickets.version, t.version)))
      .returning();
    if (!updated) throw conflict("A solicitação foi atualizada por outra pessoa.");
    await tx.insert(ticketEvents).values({ ticketId: t.id, type: "assigned", fromValue: t.assigneeUserId, toValue: assigneeUserId, actorUserId: ctx.actor.userId });
  });
}

export async function agentChangePriority(ctx: Ctx, number: number, priority: TicketPriority) {
  await getDb().transaction(async (tx) => {
    const t = await findTicketForAgent(ctx, number, tx);
    const policy = await activePolicy(t.categoryId, priority, tx);
    const cal = policy ? await loadCalendar(policy.calendarId, tx) : null;
    const resolutionDueAt =
      policy && cal ? addBusinessMinutes(t.createdAt, policy.resolutionMinutes + t.pausedBusinessMinutes + (t.pausedAt ? businessMinutesBetween(t.pausedAt, new Date(), cal) : 0), cal) : null;
    const [updated] = await tx
      .update(tickets)
      .set({
        priority,
        slaPolicyId: policy?.id ?? null,
        resolutionDueAt,
        firstResponseDueAt: policy && cal ? addBusinessMinutes(t.createdAt, policy.firstResponseMinutes, cal) : null,
        updatedAt: new Date(),
        version: sql`${tickets.version} + 1`,
      })
      .where(and(eq(tickets.id, t.id), eq(tickets.version, t.version)))
      .returning();
    if (!updated) throw conflict("A solicitação foi atualizada por outra pessoa.");
    await tx.insert(ticketEvents).values({ ticketId: t.id, type: "priority_changed", fromValue: t.priority, toValue: priority, actorUserId: ctx.actor.userId });
  });
}

// ── Job de SLA: alertas de risco, violação e fechamento automático ───────────

export async function runSlaMonitor(now = new Date()) {
  const db = getDb();
  const open = await db
    .select({ t: tickets, policy: slaPolicies })
    .from(tickets)
    .innerJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
    .where(and(inArray(tickets.status, ["aberto", "em_andamento", "aguardando_colaborador", "respondido"]), isNull(tickets.pausedAt)));
  let warned = 0;
  let breached = 0;
  for (const { t, policy } of open) {
    const cal = await loadCalendar(policy.calendarId);
    if (!cal || !t.resolutionDueAt) continue;
    const elapsed = businessMinutesBetween(t.createdAt, now, cal) - t.pausedBusinessMinutes;
    const pct = (elapsed / policy.resolutionMinutes) * 100;
    if (!t.warnedAt && pct >= policy.warnAtPercent && now < t.resolutionDueAt) {
      await db.update(tickets).set({ warnedAt: now }).where(eq(tickets.id, t.id));
      await db.insert(ticketEvents).values({ ticketId: t.id, type: "sla_warning", note: `${Math.round(pct)}% do prazo consumido` });
      if (t.assigneeUserId) await notify([t.assigneeUserId], { category: "solicitacoes", title: `Solicitação #${t.number} próxima do vencimento`, link: `/rh/solicitacoes/${t.number}` });
      warned++;
    }
    if (!t.resolutionBreachedAt && now >= t.resolutionDueAt) {
      await db.update(tickets).set({ resolutionBreachedAt: now }).where(eq(tickets.id, t.id));
      await db.insert(ticketEvents).values({ ticketId: t.id, type: "sla_breached", note: "Prazo de resolução excedido" });
      if (t.assigneeUserId) await notify([t.assigneeUserId], { category: "solicitacoes", title: `Solicitação #${t.number} com prazo excedido`, link: `/rh/solicitacoes/${t.number}` });
      breached++;
    }
    if (!t.firstRespondedAt && !t.firstResponseBreachedAt && t.firstResponseDueAt && now >= t.firstResponseDueAt) {
      await db.update(tickets).set({ firstResponseBreachedAt: now }).where(eq(tickets.id, t.id));
      await db.insert(ticketEvents).values({ ticketId: t.id, type: "sla_breached", note: "Prazo de primeira resposta excedido" });
    }
  }
  // Resolvidos sem manifestação após a janela de reabertura são fechados automaticamente.
  const toClose = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.status, "resolvido"), lte(tickets.resolvedAt, new Date(now.getTime() - REOPEN_WINDOW_DAYS * 86400_000))));
  for (const t of toClose) {
    await db.transaction((tx) => transition(tx, t, "fechado", "system", null, "Encerrado automaticamente")).catch((err) => logger.warn("sla.autoclose_failed", { err, ticket: t.number }));
  }
  return { warned, breached, closed: toClose.length };
}
