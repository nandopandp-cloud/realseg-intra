import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { requirePermission, type Ctx } from "../auth/actor";
import { getDb, type Executor } from "../db/client";
import { notificationCategory, notificationPreferences, notifications, type NotificationCategory } from "../db/schema";
import { notFound } from "../errors";

export const NOTIFICATION_CATEGORIES = notificationCategory.enumValues;
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  comunicados: "Comunicados",
  documentos: "Documentos",
  solicitacoes: "Solicitações",
  cursos: "Cursos",
  carreira: "Carreira",
  feedbacks: "Feedbacks",
  conta: "Segurança da conta",
};
/** Categorias que não podem ser desativadas (avisos de segurança e obrigações). */
export const MANDATORY_CATEGORIES: NotificationCategory[] = ["conta"];

export async function unreadCount(ctx: Ctx) {
  requirePermission(ctx.actor, "notification:read:own");
  const [row] = await getDb()
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, ctx.actor.userId), isNull(notifications.readAt)));
  return row.n;
}

export async function listNotifications(ctx: Ctx, opts: { filter?: "all" | "unread"; page?: number; pageSize?: number } = {}) {
  requirePermission(ctx.actor, "notification:read:own");
  const pageSize = opts.pageSize ?? 20;
  const page = opts.page ?? 1;
  const where = and(eq(notifications.userId, ctx.actor.userId), opts.filter === "unread" ? isNull(notifications.readAt) : undefined);
  const db = getDb();
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        category: notifications.category,
        title: notifications.title,
        body: notifications.body,
        link: notifications.link,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(notifications).where(where),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function markRead(ctx: Ctx, id: string) {
  requirePermission(ctx.actor, "notification:read:own");
  const [row] = await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, ctx.actor.userId)))
    .returning({ id: notifications.id });
  if (!row) throw notFound("Notificação");
}

export async function markAllRead(ctx: Ctx) {
  requirePermission(ctx.actor, "notification:read:own");
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, ctx.actor.userId), isNull(notifications.readAt)));
}

/**
 * Cria notificações in-app respeitando as preferências de cada usuário.
 * Título/corpo nunca devem conter dados sensíveis (ex.: valores, diagnósticos, conteúdo de feedback).
 */
export async function notify(
  userIds: string[],
  n: { category: NotificationCategory; title: string; body?: string; link?: string; entityType?: string; entityId?: string },
  db: Executor = getDb(),
) {
  if (!userIds.length) return;
  let recipients = userIds;
  if (!MANDATORY_CATEGORIES.includes(n.category)) {
    const optedOut = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(and(inArray(notificationPreferences.userId, userIds), eq(notificationPreferences.category, n.category), eq(notificationPreferences.inApp, false)));
    const out = new Set(optedOut.map((o) => o.userId));
    recipients = userIds.filter((u) => !out.has(u));
  }
  if (!recipients.length) return;
  await db.insert(notifications).values(
    recipients.map((userId) => ({
      userId,
      category: n.category,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      entityType: n.entityType ?? null,
      entityId: n.entityId ?? null,
    })),
  );
}

export async function getNotificationPreferences(ctx: Ctx) {
  requirePermission(ctx.actor, "profile:read:own");
  const rows = await getDb().select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.actor.userId));
  const map = new Map(rows.map((r) => [r.category, r]));
  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    inApp: MANDATORY_CATEGORIES.includes(category) ? true : (map.get(category)?.inApp ?? true),
    mandatory: MANDATORY_CATEGORIES.includes(category),
  }));
}

export async function setNotificationPreference(ctx: Ctx, category: NotificationCategory, inApp: boolean) {
  requirePermission(ctx.actor, "profile:update:own");
  if (MANDATORY_CATEGORIES.includes(category)) return;
  await getDb()
    .insert(notificationPreferences)
    .values({ userId: ctx.actor.userId, category, inApp })
    .onConflictDoUpdate({ target: [notificationPreferences.userId, notificationPreferences.category], set: { inApp, updatedAt: new Date() } });
}
