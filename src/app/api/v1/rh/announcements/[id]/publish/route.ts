import type { z } from "zod";
import { announcementPublishSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { publishAnnouncement } from "@/server/services/rh/announcements";

export const POST = authed<{ id: string }, z.infer<typeof announcementPublishSchema>>({ permission: "announcement:manage", body: announcementPublishSchema }, async ({ actor, meta, params, body }) =>
  publishAnnouncement({ actor, meta }, parseId(params.id, "Comunicado"), body),
);
