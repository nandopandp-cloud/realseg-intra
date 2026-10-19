import { eq } from "drizzle-orm";
import { audit } from "../audit";
import { requirePermission, type Ctx } from "../auth/actor";
import { getDb } from "../db/client";
import { departments, employees, jobFamilies, jobPositions, units, userPreferences, users } from "../db/schema";
import { listActiveSessions, revokeSession } from "../auth/session";
import { notFound } from "../errors";
import { FEATURES } from "@/lib/features";

/** Atalhos disponíveis na Home ("Personalizar"). */
export const SHORTCUT_KEYS = ["comunicados", "documentos", "cursos", "carreira", "solicitacoes", "ajuda", "fale-com-rh", "avaliacoes"] as const;
export type ShortcutKey = (typeof SHORTCUT_KEYS)[number];
/** Atalhos que podem ser escolhidos agora (áreas ocultas ficam de fora, inclusive de preferências antigas). */
export const isShortcutAvailable = (k: string): k is ShortcutKey => (SHORTCUT_KEYS as readonly string[]).includes(k) && (FEATURES.talkToHr || k !== "fale-com-rh");
export const DEFAULT_SHORTCUTS: ShortcutKey[] = ["comunicados", "documentos", "cursos", "carreira"];

export async function getProfile(ctx: Ctx) {
  requirePermission(ctx.actor, "profile:read:own");
  const [row] = await getDb()
    .select({
      email: users.email,
      lastLoginAt: users.lastLoginAt,
      passwordChangedAt: users.passwordChangedAt,
      fullName: employees.fullName,
      preferredName: employees.preferredName,
      registrationNumber: employees.registrationNumber,
      admissionDate: employees.admissionDate,
      department: departments.name,
      unit: units.name,
      unitCity: units.city,
      unitState: units.state,
      position: jobPositions.title,
      positionLevel: jobPositions.levelLabel,
      family: jobFamilies.name,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(units, eq(units.id, employees.unitId))
    .leftJoin(jobPositions, eq(jobPositions.id, employees.jobPositionId))
    .leftJoin(jobFamilies, eq(jobFamilies.id, jobPositions.familyId))
    .where(eq(users.id, ctx.actor.userId));
  if (!row) throw notFound("Perfil");
  return row;
}

export async function getPreferences(ctx: Ctx) {
  const [row] = await getDb().select().from(userPreferences).where(eq(userPreferences.userId, ctx.actor.userId));
  const shortcuts = (row?.homeShortcuts ?? DEFAULT_SHORTCUTS).filter(isShortcutAvailable);
  return { homeShortcuts: shortcuts.length ? shortcuts : DEFAULT_SHORTCUTS, sidebarCollapsed: row?.sidebarCollapsed ?? false };
}

export async function updatePreferences(ctx: Ctx, input: { homeShortcuts?: ShortcutKey[]; sidebarCollapsed?: boolean }) {
  requirePermission(ctx.actor, "profile:update:own");
  const set: Partial<typeof userPreferences.$inferInsert> = {};
  if (input.homeShortcuts) set.homeShortcuts = [...new Set(input.homeShortcuts)];
  if (input.sidebarCollapsed !== undefined) set.sidebarCollapsed = input.sidebarCollapsed;
  await getDb()
    .insert(userPreferences)
    .values({ userId: ctx.actor.userId, ...set })
    .onConflictDoUpdate({ target: userPreferences.userId, set: { ...set, updatedAt: new Date() } });
  if (input.homeShortcuts) {
    await audit({ action: "profile.preferences_updated", actorUserId: ctx.actor.userId, entityType: "user", entityId: ctx.actor.userId, metadata: { fields: ["homeShortcuts"] }, meta: ctx.meta });
  }
}

export async function mySessions(ctx: Ctx) {
  requirePermission(ctx.actor, "profile:read:own");
  const rows = await listActiveSessions(ctx.actor.userId);
  // O identificador exposto é um prefixo do hash — suficiente para revogar, inútil para autenticar.
  return rows.map((r) => ({ id: r.id.slice(0, 16), current: r.id === ctx.actor.sessionId, createdAt: r.createdAt, lastSeenAt: r.lastSeenAt, userAgent: r.userAgent }));
}

export async function revokeMySession(ctx: Ctx, idPrefix: string) {
  requirePermission(ctx.actor, "profile:update:own");
  const rows = await listActiveSessions(ctx.actor.userId);
  const target = rows.find((r) => r.id.slice(0, 16) === idPrefix && r.id !== ctx.actor.sessionId);
  if (!target) throw notFound("Sessão");
  await revokeSession(target.id);
  await audit({ action: "auth.session_revoked", actorUserId: ctx.actor.userId, entityType: "user", entityId: ctx.actor.userId, meta: ctx.meta });
}
