import { and, asc, count, desc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import {
  departments,
  employees,
  fileAssets,
  jobPositions,
  slaPolicies,
  ticketAttachments,
  ticketCategories,
  ticketEvents,
  ticketMessages,
  tickets,
  units,
  users,
  type TicketPriority,
  type TicketStatus,
} from "../../db/schema";
import { notFound } from "../../errors";
import { computeSlaView } from "../../sla/ticket-sla";
import { allowedTransitions, OPEN_STATUSES } from "../../tickets/state-machine";
import { textSearch } from "../audience";
import { loadCalendar, ticketListFields, withSla } from "../tickets";

export const QUEUE_TABS = ["abertas", "sem-responsavel", "minhas", "aguardando", "atrasadas", "concluidas"] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

export const PRIORITY_LABEL: Record<TicketPriority, string> = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };

/** Rótulos do ponto de vista do atendimento (o colaborador vê "Aguardando você"). */
export const AGENT_STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  aguardando_colaborador: "Aguardando colaborador",
  respondido: "Respondido",
  resolvido: "Resolvido",
  fechado: "Concluído",
  cancelado: "Cancelado",
};

const DONE: TicketStatus[] = ["resolvido", "fechado", "cancelado"];
const overdue = sql`(${tickets.resolutionDueAt} < now() AND ${tickets.pausedAt} IS NULL)`;

function tabWhere(tab: QueueTab, userId: string): SQL | undefined {
  switch (tab) {
    case "abertas":
      return inArray(tickets.status, OPEN_STATUSES);
    case "sem-responsavel":
      return and(inArray(tickets.status, OPEN_STATUSES), isNull(tickets.assigneeUserId));
    case "minhas":
      return and(inArray(tickets.status, OPEN_STATUSES), eq(tickets.assigneeUserId, userId));
    case "aguardando":
      return eq(tickets.status, "aguardando_colaborador");
    case "atrasadas":
      return and(inArray(tickets.status, OPEN_STATUSES), overdue);
    case "concluidas":
      return inArray(tickets.status, DONE);
  }
}

const assignee = alias(employees, "assignee_employee");

/** Fila de atendimento (todas as solicitações). Exige `ticket:read:any`. */
export async function listQueue(
  ctx: Ctx,
  opts: { tab?: QueueTab; q?: string; category?: string; priority?: TicketPriority; page?: number; pageSize?: number } = {},
) {
  requirePermission(ctx.actor, "ticket:read:any");
  const tab = opts.tab ?? "abertas";
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const qNumber = opts.q?.replace(/^#/, "").trim() ?? "";
  const search = opts.q
    ? or(textSearch([tickets.subject, employees.fullName, employees.registrationNumber], opts.q), /^\d{1,9}$/.test(qNumber) ? eq(tickets.number, Number(qNumber)) : undefined)
    : undefined;
  const base = and(search, opts.category ? eq(ticketCategories.slug, opts.category) : undefined, opts.priority ? eq(tickets.priority, opts.priority) : undefined);
  const where = and(base, tabWhere(tab, ctx.actor.userId));
  const db = getDb();
  const from = () =>
    db
      .select({
        ...ticketListFields,
        assigneeUserId: tickets.assigneeUserId,
        requester: { name: employees.fullName, registration: employees.registrationNumber },
        assigneeName: assignee.fullName,
        assigneeEmail: users.email,
      })
      .from(tickets)
      .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .innerJoin(employees, eq(employees.id, tickets.requesterEmployeeId))
      .leftJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
      .leftJoin(users, eq(users.id, tickets.assigneeUserId))
      .leftJoin(assignee, eq(assignee.userId, tickets.assigneeUserId));

  const counted = () =>
    db.select({ n: count() }).from(tickets).innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId)).innerJoin(employees, eq(employees.id, tickets.requesterEmployeeId));

  const open = inArray(tickets.status, OPEN_STATUSES);
  const [rows, [{ n: total }], [counts]] = await Promise.all([
    from()
      .where(where)
      // Abertas: mais urgentes primeiro (vencidas, depois vencimento mais próximo); concluídas: mais recentes.
      .orderBy(
        ...(tab === "concluidas"
          ? [desc(tickets.updatedAt)]
          : [sql`CASE ${tickets.priority} WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 ELSE 2 END`, sql`${tickets.resolutionDueAt} ASC NULLS LAST`, asc(tickets.createdAt)]),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    counted().where(where),
    db
      .select({
        abertas: sql<number>`count(*) FILTER (WHERE ${open})`.mapWith(Number),
        semResponsavel: sql<number>`count(*) FILTER (WHERE ${open} AND ${tickets.assigneeUserId} IS NULL)`.mapWith(Number),
        minhas: sql<number>`count(*) FILTER (WHERE ${open} AND ${tickets.assigneeUserId} = ${ctx.actor.userId})`.mapWith(Number),
        aguardando: sql<number>`count(*) FILTER (WHERE ${tickets.status} = 'aguardando_colaborador')`.mapWith(Number),
        atrasadas: sql<number>`count(*) FILTER (WHERE ${open} AND ${overdue})`.mapWith(Number),
        concluidas: sql<number>`count(*) FILTER (WHERE ${inArray(tickets.status, DONE)})`.mapWith(Number),
      })
      .from(tickets)
      .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .innerJoin(employees, eq(employees.id, tickets.requesterEmployeeId))
      .where(base),
  ]);
  return { items: await withSla(rows), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts };
}

/** Equipe de atendimento: usuários ativos cujo papel concede `ticket:manage`. */
export async function listAgents(ctx: Ctx) {
  requirePermission(ctx.actor, "ticket:read:any");
  const r = await getDb().execute<{ id: string; email: string; name: string | null }>(sql`
    SELECT DISTINCT u.id, u.email, e.full_name AS name
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.permission_key = 'ticket:manage'
    LEFT JOIN employees e ON e.user_id = u.id
    WHERE u.status = 'active' AND u.deleted_at IS NULL
    ORDER BY name NULLS LAST, u.email`);
  return r.rows.map((a) => ({ id: a.id, name: a.name ?? a.email }));
}

/** Solicitação completa para o atendimento, inclusive notas internas e dados do solicitante. */
export async function getTicketForAgent(ctx: Ctx, number: number) {
  requirePermission(ctx.actor, "ticket:read:any");
  const db = getDb();
  const [row] = await db
    .select({
      t: tickets,
      category: { slug: ticketCategories.slug, name: ticketCategories.name, color: ticketCategories.color, icon: ticketCategories.icon },
      resolutionMinutes: slaPolicies.resolutionMinutes,
      firstResponseMinutes: slaPolicies.firstResponseMinutes,
      calendarId: slaPolicies.calendarId,
      requester: {
        employeeId: employees.id,
        userId: employees.userId,
        name: employees.fullName,
        registration: employees.registrationNumber,
        department: departments.name,
        unit: units.name,
        position: jobPositions.title,
      },
    })
    .from(tickets)
    .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
    .innerJoin(employees, eq(employees.id, tickets.requesterEmployeeId))
    .innerJoin(departments, eq(departments.id, employees.departmentId))
    .innerJoin(units, eq(units.id, employees.unitId))
    .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
    .leftJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
    .where(eq(tickets.number, number))
    .limit(1);
  if (!row) throw notFound("Solicitação");
  const t = row.t;
  const author = alias(employees, "author_employee");
  const [messages, attachments, events, agents, history] = await Promise.all([
    db
      .select({ id: ticketMessages.id, body: ticketMessages.body, createdAt: ticketMessages.createdAt, isInternal: ticketMessages.isInternal, authorUserId: ticketMessages.authorUserId, authorName: author.fullName })
      .from(ticketMessages)
      .leftJoin(author, eq(author.userId, ticketMessages.authorUserId))
      .where(eq(ticketMessages.ticketId, t.id))
      .orderBy(asc(ticketMessages.createdAt)),
    db
      .select({ id: ticketAttachments.id, messageId: ticketAttachments.messageId, name: fileAssets.originalName, sizeBytes: fileAssets.sizeBytes, mimeType: fileAssets.mimeType })
      .from(ticketAttachments)
      .innerJoin(fileAssets, eq(fileAssets.id, ticketAttachments.fileId))
      .where(eq(ticketAttachments.ticketId, t.id))
      .orderBy(asc(ticketAttachments.createdAt)),
    db
      .select({ id: ticketEvents.id, type: ticketEvents.type, fromValue: ticketEvents.fromValue, toValue: ticketEvents.toValue, note: ticketEvents.note, createdAt: ticketEvents.createdAt, actorName: author.fullName })
      .from(ticketEvents)
      .leftJoin(author, eq(author.userId, ticketEvents.actorUserId))
      .where(and(eq(ticketEvents.ticketId, t.id), sql`${ticketEvents.type} <> 'message_added'`))
      .orderBy(desc(ticketEvents.createdAt)),
    listAgents(ctx),
    // Outras solicitações do mesmo colaborador (contexto para o atendimento).
    db
      .select({ number: tickets.number, subject: tickets.subject, status: tickets.status, createdAt: tickets.createdAt })
      .from(tickets)
      .where(and(eq(tickets.requesterEmployeeId, t.requesterEmployeeId), sql`${tickets.id} <> ${t.id}`))
      .orderBy(desc(tickets.createdAt))
      .limit(5),
  ]);
  const cal = row.calendarId ? await loadCalendar(row.calendarId) : null;
  const sla = computeSlaView({ ...t, resolutionMinutes: row.resolutionMinutes }, cal, new Date());
  const agentName = (id: string | null) => (id ? (agents.find((a) => a.id === id)?.name ?? "Equipe de atendimento") : null);
  return {
    id: t.id,
    number: t.number,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    channel: t.channel,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    version: t.version,
    firstRespondedAt: t.firstRespondedAt,
    assigneeUserId: t.assigneeUserId,
    assigneeName: agentName(t.assigneeUserId),
    category: row.category,
    requester: row.requester,
    sla,
    messages: messages.map((m) => ({
      ...m,
      fromRequester: m.authorUserId === row.requester.userId,
      authorName: m.authorUserId === row.requester.userId ? row.requester.name : (m.authorName ?? "Equipe de atendimento"),
    })),
    attachments,
    events: events.map((e) => ({
      ...e,
      fromLabel: e.type === "assigned" ? agentName(e.fromValue) : e.fromValue,
      toLabel: e.type === "assigned" ? (agentName(e.toValue) ?? "Sem responsável") : e.toValue,
    })),
    agents,
    history,
    transitions: allowedTransitions(t.status, "agent"),
    closed: t.status === "fechado" || t.status === "cancelado",
  };
}

/** Download de anexo pelo atendimento (inclui anexos de notas internas). Auditado. */
export async function openTicketAttachmentAsAgent(ctx: Ctx, number: number, attachmentId: string) {
  requirePermission(ctx.actor, "ticket:read:any");
  const [row] = await getDb()
    .select({ asset: fileAssets, ticketId: tickets.id })
    .from(ticketAttachments)
    .innerJoin(tickets, eq(tickets.id, ticketAttachments.ticketId))
    .innerJoin(fileAssets, eq(fileAssets.id, ticketAttachments.fileId))
    .where(and(eq(ticketAttachments.id, attachmentId), eq(tickets.number, number)));
  if (!row) throw notFound("Anexo");
  await audit({ action: "ticket.attachment_downloaded", actorUserId: ctx.actor.userId, entityType: "ticket", entityId: row.ticketId, metadata: { attachmentId, by: "agent" }, meta: ctx.meta });
  return row.asset;
}

/** Indicadores do atendimento para o painel. */
export async function queueSummary(ctx: Ctx) {
  requirePermission(ctx.actor, "ticket:read:any");
  const db = getDb();
  const open = inArray(tickets.status, OPEN_STATUSES);
  const [[c], urgent] = await Promise.all([
    db
      .select({
        abertas: sql<number>`count(*) FILTER (WHERE ${open})`.mapWith(Number),
        semResponsavel: sql<number>`count(*) FILTER (WHERE ${open} AND ${tickets.assigneeUserId} IS NULL)`.mapWith(Number),
        minhas: sql<number>`count(*) FILTER (WHERE ${open} AND ${tickets.assigneeUserId} = ${ctx.actor.userId})`.mapWith(Number),
        atrasadas: sql<number>`count(*) FILTER (WHERE ${open} AND ${overdue})`.mapWith(Number),
        emRisco: sql<number>`count(*) FILTER (WHERE ${open} AND ${tickets.warnedAt} IS NOT NULL AND NOT ${overdue})`.mapWith(Number),
        resolvidas30: sql<number>`count(*) FILTER (WHERE ${tickets.resolvedAt} >= now() - interval '30 days')`.mapWith(Number),
        noPrazo30: sql<number>`count(*) FILTER (WHERE ${tickets.resolvedAt} >= now() - interval '30 days' AND (${tickets.resolutionDueAt} IS NULL OR ${tickets.resolvedAt} <= ${tickets.resolutionDueAt}))`.mapWith(Number),
      })
      .from(tickets),
    db
      .select({ ...ticketListFields, requester: { name: employees.fullName }, assigneeUserId: tickets.assigneeUserId })
      .from(tickets)
      .innerJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .innerJoin(employees, eq(employees.id, tickets.requesterEmployeeId))
      .leftJoin(slaPolicies, eq(slaPolicies.id, tickets.slaPolicyId))
      .where(and(open, isNotNull(tickets.resolutionDueAt), isNull(tickets.pausedAt)))
      .orderBy(asc(tickets.resolutionDueAt))
      .limit(5),
  ]);
  return { ...c, urgent: await withSla(urgent) };
}
