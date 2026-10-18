import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, type Executor } from "../db/client";
import { employees, jobPositions, rolePermissions, roles, sessions, userRoles, users } from "../db/schema";
import { env } from "../env";
import type { Actor } from "./actor";
import { generateToken, sha256Hex } from "./crypto";
import type { Permission, RoleKey } from "./permissions";

export const SESSION_COOKIE = "rs_session";
/** Evita escrita a cada requisição: last_seen_at só é atualizado após este intervalo. */
const TOUCH_INTERVAL_MS = 60_000;

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env().APP_ENV === "production" || env().APP_URL.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function createSession(
  userId: string,
  meta: { userAgent: string | null; ipHash: string | null },
  db: Executor = getDb(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + env().SESSION_ABSOLUTE_HOURS * 3600_000);
  await db.insert(sessions).values({
    id: sha256Hex(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 200) ?? null,
    ipHash: meta.ipHash,
  });
  return { token, expiresAt };
}

export type SessionValidation = { status: "valid"; actor: Actor } | { status: "expired" } | { status: "invalid" };

/** Valida o token do cookie (expiração absoluta, inatividade, revogação, usuário ativo) e carrega o Actor. */
export async function validateSessionToken(token: string): Promise<SessionValidation> {
  if (!token || token.length > 100) return { status: "invalid" };
  const db = getDb();
  const id = sha256Hex(token);
  const [row] = await db
    .select({
      session: sessions,
      user: { id: users.id, email: users.email, status: users.status, mustChangePassword: users.mustChangePassword, deletedAt: users.deletedAt },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);

  if (!row || row.session.revokedAt) return { status: "invalid" };
  const now = Date.now();
  const idleLimit = env().SESSION_IDLE_MINUTES * 60_000;
  if (row.session.expiresAt.getTime() <= now || row.session.lastSeenAt.getTime() + idleLimit <= now) {
    return { status: "expired" };
  }
  if (row.user.status !== "active" || row.user.deletedAt) return { status: "invalid" };

  if (now - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }

  const actor = await loadActor(row.user.id, id, row.user.email, row.user.mustChangePassword);
  return { status: "valid", actor };
}

export async function loadActor(userId: string, sessionId: string, email: string, mustChangePassword: boolean): Promise<Actor> {
  const db = getDb();
  const [emp, perms] = await Promise.all([
    db
      .select({
        id: employees.id,
        fullName: employees.fullName,
        preferredName: employees.preferredName,
        registrationNumber: employees.registrationNumber,
        departmentId: employees.departmentId,
        unitId: employees.unitId,
        jobPositionId: employees.jobPositionId,
        jobFamilyId: jobPositions.familyId,
        status: employees.status,
      })
      .from(employees)
      .innerJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
      .where(eq(employees.userId, userId))
      .limit(1),
    db
      .select({ role: roles.key, permission: rolePermissions.permissionKey })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(eq(userRoles.userId, userId)),
  ]);

  const roleSet = new Set<RoleKey>();
  const permSet = new Set<Permission>();
  for (const p of perms) {
    roleSet.add(p.role as RoleKey);
    if (p.permission) permSet.add(p.permission as Permission);
  }

  const e = emp[0];
  return {
    userId,
    sessionId,
    email,
    mustChangePassword,
    roles: [...roleSet],
    permissions: permSet,
    employee:
      e && e.status !== "desligado"
        ? {
            id: e.id,
            fullName: e.fullName,
            preferredName: e.preferredName,
            registrationNumber: e.registrationNumber,
            departmentId: e.departmentId,
            unitId: e.unitId,
            jobPositionId: e.jobPositionId,
            jobFamilyId: e.jobFamilyId,
          }
        : null,
  };
}

export async function revokeSession(sessionId: string, db: Executor = getDb()) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

/** Revoga todas as sessões do usuário (opcionalmente preservando a atual). */
export async function revokeAllSessions(userId: string, exceptSessionId?: string, db: Executor = getDb()) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        exceptSessionId ? sql`${sessions.id} <> ${exceptSessionId}` : undefined,
      ),
    );
}

export async function listActiveSessions(userId: string) {
  return getDb()
    .select({ id: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, userAgent: sessions.userAgent })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .orderBy(sql`${sessions.lastSeenAt} desc`);
}
