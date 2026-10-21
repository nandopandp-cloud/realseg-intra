import { authed, parseId } from "@/server/http/route";
import { duplicateAnnouncement } from "@/server/services/rh/announcements";

export const POST = authed<{ id: string }>({ permission: "announcement:manage" }, async ({ actor, meta, params }) => {
  const r = await duplicateAnnouncement({ actor, meta }, parseId(params.id, "Comunicado"));
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
