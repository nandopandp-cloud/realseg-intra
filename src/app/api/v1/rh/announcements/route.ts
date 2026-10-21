import { announcementSchema, type AnnouncementInput } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { createAnnouncement } from "@/server/services/rh/announcements";

/** Cria um comunicado como rascunho. */
export const POST = authed<Record<string, string>, AnnouncementInput>({ permission: "announcement:manage", body: announcementSchema }, async ({ actor, meta, body }) => {
  const r = await createAnnouncement({ actor, meta }, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
