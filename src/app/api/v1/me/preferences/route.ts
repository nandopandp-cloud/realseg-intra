import { z } from "zod";
import { authed } from "@/server/http/route";
import { getPreferences, SHORTCUT_KEYS, updatePreferences } from "@/server/services/profile";
import { setNotificationPreference } from "@/server/services/notifications";
import { notificationCategory } from "@/server/db/schema";

export const GET = authed({ permission: "profile:read:own" }, async ({ actor, meta }) => getPreferences({ actor, meta }));

const body = z
  .object({
    homeShortcuts: z.array(z.enum(SHORTCUT_KEYS)).min(1, "Escolha ao menos 1 atalho.").max(4, "Escolha no máximo 4 atalhos.").optional(),
    sidebarCollapsed: z.boolean().optional(),
    notification: z.object({ category: z.enum(notificationCategory.enumValues), inApp: z.boolean() }).optional(),
  })
  .strict();

export const PATCH = authed({ permission: "profile:update:own", body }, async ({ actor, meta, body }) => {
  const ctx = { actor, meta };
  if (body.homeShortcuts || body.sidebarCollapsed !== undefined) await updatePreferences(ctx, body);
  if (body.notification) await setNotificationPreference(ctx, body.notification.category, body.notification.inApp);
  return getPreferences(ctx);
});
