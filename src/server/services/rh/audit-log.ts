import { and, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { requirePermission, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { auditEvents, employees, users } from "../../db/schema";
import { textSearch } from "../audience";

/** Grupos de ações para o filtro da auditoria (prefixo da ação). */
export const AUDIT_GROUPS = {
  auth: "Acesso e senha",
  document: "Documentos",
  submission: "Envios ao RH",
  announcement: "Comunicados",
  ticket: "Solicitações",
  course: "Cursos",
  employee: "Colaboradores",
  feedback: "Feedbacks",
  opportunity: "Oportunidades",
  settings: "Configurações",
  report: "Relatórios exportados",
} as const;
export type AuditGroup = keyof typeof AUDIT_GROUPS;

type Filters = { group?: AuditGroup; actor?: string; entityId?: string; from?: string; to?: string; page?: number; pageSize?: number };

function where(f: Filters) {
  return and(
    f.group ? like(auditEvents.action, `${f.group}.%`) : undefined,
    f.actor ? or(textSearch([employees.fullName, users.email], f.actor), eq(employees.registrationNumber, f.actor.trim())) : undefined,
    f.entityId ? eq(auditEvents.entityId, f.entityId.trim()) : undefined,
    f.from ? gte(auditEvents.createdAt, new Date(`${f.from}T00:00:00-03:00`)) : undefined,
    f.to ? lte(auditEvents.createdAt, new Date(`${f.to}T23:59:59-03:00`)) : undefined,
  );
}

/** Trilha de auditoria (somente leitura). Exige `audit:read`. */
export async function listAudit(ctx: Ctx, f: Filters = {}) {
  requirePermission(ctx.actor, "audit:read");
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 50;
  const db = getDb();
  const w = where(f);
  const [items, [{ n }]] = await Promise.all([
    db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        entityId: auditEvents.entityId,
        metadata: auditEvents.metadata,
        requestId: auditEvents.requestId,
        createdAt: auditEvents.createdAt,
        actorName: sql<string | null>`coalesce(${employees.fullName}, ${users.email})`,
        actorRegistration: employees.registrationNumber,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorUserId))
      .leftJoin(employees, eq(employees.userId, auditEvents.actorUserId))
      .where(w)
      .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(auditEvents).leftJoin(users, eq(users.id, auditEvents.actorUserId)).leftJoin(employees, eq(employees.userId, auditEvents.actorUserId)).where(w),
  ]);
  return { items, total: n, page, pageSize, pageCount: Math.max(1, Math.ceil(n / pageSize)) };
}

/** Exportação da trilha filtrada (até 10 mil linhas) por quem pode consultá-la. A própria exportação é auditada. */
export async function auditCsv(ctx: Ctx, f: Filters) {
  requirePermission(ctx.actor, "audit:read");
  const r = await listAudit(ctx, { ...f, page: 1, pageSize: 10_000 });
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    "Data;Ação;Quem;Matrícula;Entidade;ID;Detalhes;Requisição",
    ...r.items.map((i) =>
      [i.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), i.action, i.actorName ?? "Sistema", i.actorRegistration ?? "", i.entityType, i.entityId ?? "", i.metadata ? JSON.stringify(i.metadata) : "", i.requestId ?? ""].map((v) => esc(String(v))).join(";"),
    ),
  ];
  await audit({ action: "report.exported", actorUserId: ctx.actor.userId, entityType: "audit", metadata: { report: "audit", rows: r.items.length, filters: { group: f.group ?? null, from: f.from ?? null, to: f.to ?? null } }, meta: ctx.meta });
  return { filename: "auditoria.csv", csv: "﻿" + lines.join("\r\n") };
}
