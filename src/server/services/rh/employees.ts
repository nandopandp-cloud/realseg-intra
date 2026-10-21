import { randomInt } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { audit } from "../../audit";
import { can, requirePermission, type Ctx } from "../../auth/actor";
import { generateToken, hashPassword, sha256Hex } from "../../auth/crypto";
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from "../../auth/permissions";
import { revokeAllSessions } from "../../auth/session";
import { getDb, type Executor } from "../../db/client";
import {
  departments,
  documents,
  employees,
  enrollments,
  feedbacks,
  jobFamilies,
  jobPositions,
  passwordResetTokens,
  roles,
  sessions,
  tickets,
  units,
  userRoles,
  users,
  type employeeStatus,
} from "../../db/schema";
import { AppError, forbidden, notFound, validation } from "../../errors";
import { env } from "../../env";
import { logger } from "../../logger";
import { getMailer } from "../../mail";
import { ref, textSearch } from "../audience";

export type EmployeeStatus = (typeof employeeStatus.enumValues)[number];
export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = { ativo: "Ativo", afastado: "Afastado", desligado: "Desligado" };
const INVITE_HOURS = 72;

export type EmployeeInput = {
  fullName: string;
  preferredName?: string | null;
  registrationNumber: string;
  email: string;
  departmentId: string;
  unitId: string;
  jobPositionId: string;
  managerEmployeeId?: string | null;
  admissionDate: string;
};

// ── Lista e detalhe ──────────────────────────────────────────────────────────

const rolesOf = sql<string[]>`coalesce((SELECT array_agg(r.key ORDER BY r.key) FROM ${userRoles} ur JOIN ${roles} r ON r.id = ur.role_id WHERE ur.user_id = ${ref(employees.userId)}), '{}')`;

export async function listEmployees(
  ctx: Ctx,
  opts: { q?: string; status?: EmployeeStatus | "todos"; department?: string; unit?: string; position?: string; role?: RoleKey; page?: number; pageSize?: number } = {},
) {
  requirePermission(ctx.actor, "employee:read:any");
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const status = opts.status ?? "todos";
  const term = opts.q?.trim();
  const base = and(
    term ? or(textSearch([employees.fullName, employees.preferredName, users.email], term), eq(employees.registrationNumber, term)) : undefined,
    opts.department ? eq(employees.departmentId, opts.department) : undefined,
    opts.unit ? eq(employees.unitId, opts.unit) : undefined,
    opts.position ? eq(employees.jobPositionId, opts.position) : undefined,
    opts.role ? sql`${opts.role} = ANY(${rolesOf})` : undefined,
  );
  const where = and(base, status === "todos" ? ne(employees.status, "desligado") : eq(employees.status, status));
  const db = getDb();
  const [items, [{ n: total }], [counts]] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.fullName,
        registration: employees.registrationNumber,
        status: employees.status,
        admissionDate: employees.admissionDate,
        email: users.email,
        lastLoginAt: users.lastLoginAt,
        lockedUntil: users.lockedUntil,
        position: jobPositions.title,
        department: departments.name,
        unit: units.name,
        roles: rolesOf,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .innerJoin(departments, eq(departments.id, employees.departmentId))
      .innerJoin(units, eq(units.id, employees.unitId))
      .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
      .where(where)
      .orderBy(asc(employees.fullName))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(employees).innerJoin(users, eq(users.id, employees.userId)).where(where),
    db
      .select({
        todos: sql<number>`count(*) FILTER (WHERE ${employees.status} <> 'desligado')`.mapWith(Number),
        ativo: sql<number>`count(*) FILTER (WHERE ${employees.status} = 'ativo')`.mapWith(Number),
        afastado: sql<number>`count(*) FILTER (WHERE ${employees.status} = 'afastado')`.mapWith(Number),
        desligado: sql<number>`count(*) FILTER (WHERE ${employees.status} = 'desligado')`.mapWith(Number),
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(base),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts };
}

export async function getEmployee(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "employee:read:any");
  const db = getDb();
  const [row] = await db
    .select({
      e: employees,
      user: { id: users.id, email: users.email, status: users.status, lastLoginAt: users.lastLoginAt, lockedUntil: users.lockedUntil, mustChangePassword: users.mustChangePassword, failedLoginCount: users.failedLoginCount, createdAt: users.createdAt },
      department: departments.name,
      unit: units.name,
      position: jobPositions.title,
      positionLevel: jobPositions.levelLabel,
      family: jobFamilies.name,
      roles: rolesOf,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .innerJoin(departments, eq(departments.id, employees.departmentId))
    .innerJoin(units, eq(units.id, employees.unitId))
    .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
    .innerJoin(jobFamilies, eq(jobFamilies.id, jobPositions.familyId))
    .where(eq(employees.id, id))
    .limit(1);
  if (!row) throw notFound("Colaborador");
  const [manager, team, [stats], activeSessions, recentTickets] = await Promise.all([
    row.e.managerEmployeeId
      ? db.select({ id: employees.id, name: employees.fullName }).from(employees).where(eq(employees.id, row.e.managerEmployeeId)).then((r) => r[0] ?? null)
      : null,
    db.select({ id: employees.id, name: employees.fullName, status: employees.status }).from(employees).where(eq(employees.managerEmployeeId, id)).orderBy(asc(employees.fullName)),
    db
      .select({
        documents: sql<number>`(SELECT count(*) FROM ${documents} d WHERE d.owner_employee_id = ${id} AND d.deleted_at IS NULL)`.mapWith(Number),
        openTickets: sql<number>`(SELECT count(*) FROM ${tickets} t WHERE t.requester_employee_id = ${id} AND t.status NOT IN ('resolvido','fechado','cancelado'))`.mapWith(Number),
        coursesDone: sql<number>`(SELECT count(*) FROM ${enrollments} en WHERE en.user_id = ${row.user.id} AND en.status = 'concluido')`.mapWith(Number),
        coursesOpen: sql<number>`(SELECT count(*) FROM ${enrollments} en WHERE en.user_id = ${row.user.id} AND en.status = 'em_andamento')`.mapWith(Number),
        feedbacks: sql<number>`(SELECT count(*) FROM ${feedbacks} f WHERE f.employee_id = ${id} AND f.status = 'publicado')`.mapWith(Number),
      })
      .from(employees)
      .where(eq(employees.id, id)),
    db
      .select({ n: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, row.user.id), isNull(sessions.revokedAt), sql`${sessions.expiresAt} > now()`))
      .then((r) => r[0].n),
    db
      .select({ number: tickets.number, subject: tickets.subject, status: tickets.status, createdAt: tickets.createdAt })
      .from(tickets)
      .where(eq(tickets.requesterEmployeeId, id))
      .orderBy(desc(tickets.createdAt))
      .limit(5),
  ]);
  return {
    ...row.e,
    user: row.user,
    department: row.department,
    unit: row.unit,
    position: row.position,
    positionLevel: row.positionLevel,
    family: row.family,
    roles: row.roles as RoleKey[],
    manager,
    team,
    stats,
    activeSessions,
    recentTickets,
    locked: !!row.user.lockedUntil && row.user.lockedUntil > new Date(),
    canManage: can(ctx.actor, "employee:manage"),
    canManageRoles: can(ctx.actor, "role:manage"),
  };
}

// ── Cadastro ─────────────────────────────────────────────────────────────────

async function assertRefs(db: Executor, input: EmployeeInput, selfId?: string) {
  const [dep] = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, input.departmentId), eq(departments.active, true)));
  if (!dep) throw validation("Área inválida.", { departmentId: ["Escolha uma área ativa."] });
  const [un] = await db.select({ id: units.id }).from(units).where(and(eq(units.id, input.unitId), eq(units.active, true)));
  if (!un) throw validation("Unidade inválida.", { unitId: ["Escolha uma unidade ativa."] });
  const [pos] = await db.select({ id: jobPositions.id }).from(jobPositions).where(and(eq(jobPositions.id, input.jobPositionId), eq(jobPositions.active, true)));
  if (!pos) throw validation("Cargo inválido.", { jobPositionId: ["Escolha um cargo ativo."] });
  if (input.managerEmployeeId) {
    if (input.managerEmployeeId === selfId) throw validation("O colaborador não pode ser gestor de si mesmo.", { managerEmployeeId: ["Escolha outra pessoa."] });
    const [m] = await db.select({ id: employees.id }).from(employees).where(and(eq(employees.id, input.managerEmployeeId), ne(employees.status, "desligado")));
    if (!m) throw validation("Gestor inválido.", { managerEmployeeId: ["Escolha um colaborador ativo como gestor."] });
  }
}

async function assertUnique(db: Executor, input: { email: string; registrationNumber: string }, selfUserId?: string, selfEmployeeId?: string) {
  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = lower(${input.email})`, selfUserId ? ne(users.id, selfUserId) : undefined));
  if (byEmail) throw conflictField("email", "Já existe uma conta com este e-mail.");
  const [byReg] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.registrationNumber, input.registrationNumber), selfEmployeeId ? ne(employees.id, selfEmployeeId) : undefined));
  if (byReg) throw conflictField("registrationNumber", "Já existe um colaborador com esta matrícula.");
}

function conflictField(field: string, message: string) {
  return validation(message, { [field]: [message] });
}

/** Senha temporária legível que atende à política (≥ 10, letras e números). */
export function temporaryPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (s: string, n: number) => Array.from({ length: n }, () => s[randomInt(s.length)]).join("");
  return `${pick(upper, 1)}${pick(letters, 3)}-${pick(digits, 2)}${pick(letters, 2)}-${pick(digits, 3)}`;
}

/** Convite: link de definição de senha válido por 72 h (usa o mesmo fluxo de "Esqueci minha senha"). */
async function sendInvite(db: Executor, user: { id: string; email: string }, name: string) {
  const token = generateToken(32);
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) });
  const link = `${env().APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  try {
    const mailer = await getMailer();
    await mailer.send({
      to: user.email,
      subject: "Seu acesso à Intranet REALSEG",
      text: [
        `Olá, ${name.split(" ")[0]}!`,
        "",
        "Seu acesso à Intranet REALSEG foi criado. Para definir sua senha, acesse:",
        link,
        "",
        `O link é válido por ${INVITE_HOURS} horas e pode ser usado uma única vez.`,
        "Depois, entre com seu e-mail ou matrícula.",
      ].join("\n"),
    });
  } catch (err) {
    logger.error("mail.send_failed", { err, context: "employee.invite" });
    throw new AppError("INTERNAL", "Não foi possível enviar o e-mail. Gere uma senha temporária ou tente novamente.");
  }
}

export type AccessMode = "temp" | "invite";

/**
 * Cadastra colaborador + conta de acesso (papel COLABORADOR). O primeiro acesso é por senha temporária
 * (exibida uma única vez, troca obrigatória) ou por convite por e-mail.
 */
export async function createEmployee(ctx: Ctx, input: EmployeeInput & { access: AccessMode; roles?: RoleKey[] }) {
  requirePermission(ctx.actor, "employee:manage");
  const extraRoles = (input.roles ?? []).filter((r) => r !== "COLABORADOR");
  if (extraRoles.length && !can(ctx.actor, "role:manage")) throw forbidden();
  const db = getDb();
  return db.transaction(async (tx) => {
    await assertRefs(tx, input);
    await assertUnique(tx, input);
    const temp = input.access === "temp" ? temporaryPassword() : null;
    const [user] = await tx
      .insert(users)
      .values({ email: input.email.trim(), passwordHash: await hashPassword(temp ?? generateToken(24)), mustChangePassword: true })
      .returning({ id: users.id, email: users.email });
    const [emp] = await tx
      .insert(employees)
      .values({
        userId: user.id,
        fullName: input.fullName.trim(),
        preferredName: input.preferredName?.trim() || null,
        registrationNumber: input.registrationNumber.trim(),
        departmentId: input.departmentId,
        unitId: input.unitId,
        jobPositionId: input.jobPositionId,
        managerEmployeeId: input.managerEmployeeId || null,
        admissionDate: input.admissionDate,
      })
      .returning({ id: employees.id });
    await grantRoles(tx, ctx, user.id, ["COLABORADOR", ...extraRoles]);
    await audit({ action: "employee.created", actorUserId: ctx.actor.userId, entityType: "employee", entityId: emp.id, metadata: { access: input.access, roles: ["COLABORADOR", ...extraRoles] }, meta: ctx.meta }, tx);
    if (input.access === "invite") await sendInvite(tx, user, input.fullName);
    return { id: emp.id, temporaryPassword: temp };
  });
}

async function grantRoles(tx: Executor, ctx: Ctx, userId: string, keys: RoleKey[]) {
  const rs = await tx.select().from(roles).where(inArray(roles.key, keys));
  if (rs.length) await tx.insert(userRoles).values(rs.map((r) => ({ userId, roleId: r.id, grantedByUserId: ctx.actor.userId }))).onConflictDoNothing();
}

export async function updateEmployee(ctx: Ctx, id: string, input: EmployeeInput) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [e] = await tx.select().from(employees).where(eq(employees.id, id));
    if (!e) throw notFound("Colaborador");
    await assertRefs(tx, input, id);
    await assertUnique(tx, input, e.userId, id);
    await tx
      .update(employees)
      .set({
        fullName: input.fullName.trim(),
        preferredName: input.preferredName?.trim() || null,
        registrationNumber: input.registrationNumber.trim(),
        departmentId: input.departmentId,
        unitId: input.unitId,
        jobPositionId: input.jobPositionId,
        managerEmployeeId: input.managerEmployeeId || null,
        admissionDate: input.admissionDate,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id));
    await tx.update(users).set({ email: input.email.trim(), updatedAt: new Date() }).where(eq(users.id, e.userId));
    const changed = (["departmentId", "unitId", "jobPositionId", "managerEmployeeId", "registrationNumber"] as const).filter((k) => (e[k] ?? null) !== (input[k] ?? null));
    await audit({ action: "employee.updated", actorUserId: ctx.actor.userId, entityType: "employee", entityId: id, metadata: { changed }, meta: ctx.meta }, tx);
  });
}

/** Ativo/afastado mantêm o acesso; desligado bloqueia na próxima requisição (sessões revogadas, registros preservados). */
export async function setEmployeeStatus(ctx: Ctx, id: string, status: EmployeeStatus) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [e] = await tx.select().from(employees).where(eq(employees.id, id));
    if (!e) throw notFound("Colaborador");
    if (e.userId === ctx.actor.userId && status === "desligado") throw validation("Você não pode desligar a própria conta.");
    if (e.status === status) return;
    await tx.update(employees).set({ status, updatedAt: new Date() }).where(eq(employees.id, id));
    await tx.update(users).set({ status: status === "desligado" ? "inactive" : "active", updatedAt: new Date() }).where(eq(users.id, e.userId));
    if (status === "desligado") await revokeAllSessions(e.userId, undefined, tx);
    await audit({ action: "employee.status_changed", actorUserId: ctx.actor.userId, entityType: "employee", entityId: id, metadata: { from: e.status, to: status }, meta: ctx.meta }, tx);
  });
}

/** Novo acesso: senha temporária (retornada uma única vez) ou convite por e-mail. Também desbloqueia a conta. */
export async function resetEmployeeAccess(ctx: Ctx, id: string, mode: AccessMode) {
  requirePermission(ctx.actor, "employee:manage");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ e: employees, user: users }).from(employees).innerJoin(users, eq(users.id, employees.userId)).where(eq(employees.id, id));
    if (!row) throw notFound("Colaborador");
    if (row.e.status === "desligado") throw validation("Colaborador desligado não tem acesso. Reative-o antes.");
    const temp = mode === "temp" ? temporaryPassword() : null;
    await tx
      .update(users)
      .set({ ...(temp ? { passwordHash: await hashPassword(temp), passwordChangedAt: new Date() } : {}), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, row.user.id));
    if (temp) await revokeAllSessions(row.user.id, undefined, tx);
    if (mode === "invite") await sendInvite(tx, row.user, row.e.fullName);
    await audit({ action: "employee.access_reset", actorUserId: ctx.actor.userId, entityType: "employee", entityId: id, metadata: { mode }, meta: ctx.meta }, tx);
    return { temporaryPassword: temp };
  });
}

/** Papéis adicionais (RH, Gestor, Administrador). COLABORADOR é sempre mantido. Exige `role:manage`. */
export async function setEmployeeRoles(ctx: Ctx, id: string, keys: RoleKey[]) {
  requirePermission(ctx.actor, "role:manage");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [e] = await tx.select().from(employees).where(eq(employees.id, id));
    if (!e) throw notFound("Colaborador");
    const wanted = new Set<RoleKey>(["COLABORADOR", ...keys.filter((k) => ROLE_KEYS.includes(k))]);
    if (e.userId === ctx.actor.userId && ctx.actor.roles.includes("ADMIN") && !wanted.has("ADMIN")) throw validation("Você não pode remover o próprio papel de Administrador.");
    const all = await tx.select().from(roles);
    const keep = all.filter((r) => wanted.has(r.key as RoleKey)).map((r) => r.id);
    await tx.delete(userRoles).where(and(eq(userRoles.userId, e.userId), keep.length ? sql`${userRoles.roleId} NOT IN (${sql.join(keep.map((k) => sql`${k}`), sql`, `)})` : undefined));
    await grantRoles(tx, ctx, e.userId, [...wanted]);
    await audit({ action: "employee.roles_changed", actorUserId: ctx.actor.userId, entityType: "employee", entityId: id, metadata: { roles: [...wanted] }, meta: ctx.meta }, tx);
  });
}

export const ROLE_OPTIONS = ROLE_KEYS.filter((k) => k !== "COLABORADOR").map((k) => ({ key: k, label: ROLE_LABELS[k] }));

// ── Importação em lote (CSV) ─────────────────────────────────────────────────

export const IMPORT_COLUMNS = ["matricula", "nome", "email", "area", "unidade", "cargo", "admissao", "gestor_matricula"] as const;

type ImportRow = { line: number; ok: boolean; message: string; data?: EmployeeInput };

function parseCsv(text: string): string[][] {
  const sep = (text.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) >= (text.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const dateBr = (s: string) => {
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/**
 * Importa colaboradores de uma planilha CSV (colunas em IMPORT_COLUMNS; área pelo código ou nome, unidade e cargo
 * pelo nome). `dryRun` valida tudo sem gravar. Linhas com erro nunca são gravadas; o acesso é por convite por e-mail.
 */
export async function importEmployees(ctx: Ctx, csv: string, opts: { dryRun: boolean }) {
  requirePermission(ctx.actor, "employee:manage");
  const rows = parseCsv(csv);
  if (rows.length < 2) throw validation("A planilha está vazia ou sem cabeçalho.");
  if (rows.length > 501) throw validation("Importe no máximo 500 colaboradores por vez.");
  const header = rows[0].map(norm);
  const idx = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<(typeof IMPORT_COLUMNS)[number], number>;
  const missing = IMPORT_COLUMNS.filter((c) => c !== "gestor_matricula" && idx[c] < 0);
  if (missing.length) throw validation(`Colunas ausentes: ${missing.join(", ")}.`);
  const db = getDb();
  const [deps, uns, poss, emps, mails] = await Promise.all([
    db.select({ id: departments.id, code: departments.code, name: departments.name }).from(departments).where(eq(departments.active, true)),
    db.select({ id: units.id, name: units.name }).from(units).where(eq(units.active, true)),
    db.select({ id: jobPositions.id, title: jobPositions.title }).from(jobPositions).where(eq(jobPositions.active, true)),
    db.select({ id: employees.id, registration: employees.registrationNumber }).from(employees),
    db.select({ email: users.email }).from(users),
  ]);
  const regs = new Map(emps.map((e) => [e.registration, e.id]));
  const emailSet = new Set(mails.map((m) => m.email.toLowerCase()));
  const seenReg = new Set<string>();
  const seenEmail = new Set<string>();
  const get = (r: string[], c: (typeof IMPORT_COLUMNS)[number]) => (idx[c] >= 0 ? (r[idx[c]] ?? "").trim() : "");

  const report: ImportRow[] = rows.slice(1).map((r, i) => {
    const line = i + 2;
    const reg = get(r, "matricula");
    const name = get(r, "nome");
    const email = get(r, "email").toLowerCase();
    const errs: string[] = [];
    if (!/^\d{3,12}$/.test(reg)) errs.push("matrícula inválida");
    else if (regs.has(reg)) errs.push("matrícula já cadastrada");
    else if (seenReg.has(reg)) errs.push("matrícula repetida na planilha");
    if (name.length < 3) errs.push("nome inválido");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("e-mail inválido");
    else if (emailSet.has(email)) errs.push("e-mail já cadastrado");
    else if (seenEmail.has(email)) errs.push("e-mail repetido na planilha");
    const dep = deps.find((d) => norm(d.code) === norm(get(r, "area")) || norm(d.name) === norm(get(r, "area")));
    if (!dep) errs.push(`área "${get(r, "area")}" não encontrada`);
    const un = uns.find((u) => norm(u.name) === norm(get(r, "unidade")));
    if (!un) errs.push(`unidade "${get(r, "unidade")}" não encontrada`);
    const pos = poss.find((p) => norm(p.title) === norm(get(r, "cargo")));
    if (!pos) errs.push(`cargo "${get(r, "cargo")}" não encontrado`);
    const adm = dateBr(get(r, "admissao"));
    if (!adm) errs.push("data de admissão inválida (use dd/mm/aaaa)");
    const mgrReg = get(r, "gestor_matricula");
    const mgr = mgrReg ? regs.get(mgrReg) : undefined;
    if (mgrReg && !mgr) errs.push(`gestor ${mgrReg} não encontrado`);
    seenReg.add(reg);
    seenEmail.add(email);
    if (errs.length) return { line, ok: false, message: errs.join("; ") };
    return {
      line,
      ok: true,
      message: `${name} · ${pos!.title} · ${un!.name}`,
      data: { fullName: name, registrationNumber: reg, email, departmentId: dep!.id, unitId: un!.id, jobPositionId: pos!.id, managerEmployeeId: mgr ?? null, admissionDate: adm! },
    };
  });

  const valid = report.filter((r) => r.ok);
  let created = 0;
  if (!opts.dryRun) {
    for (const r of valid) {
      try {
        await createEmployee(ctx, { ...r.data!, access: "invite" });
        created++;
        r.message = `Cadastrado · convite enviado para ${r.data!.email}`;
      } catch (err) {
        r.ok = false;
        r.message = err instanceof Error ? err.message : "Falha ao cadastrar.";
      }
    }
    await audit({ action: "employee.imported", actorUserId: ctx.actor.userId, entityType: "employee", metadata: { rows: report.length, created }, meta: ctx.meta });
  }
  return { total: report.length, valid: valid.length, created, rows: report.map((r) => ({ line: r.line, ok: r.ok, message: r.message })) };
}

