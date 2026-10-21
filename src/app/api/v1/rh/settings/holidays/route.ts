import type { z } from "zod";
import { holidaySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { addHoliday } from "@/server/services/rh/settings";

export const POST = authed<Record<string, string>, z.infer<typeof holidaySchema>>({ permission: "sla:configure", body: holidaySchema }, async ({ actor, meta, body }) => {
  const r = await addHoliday({ actor, meta }, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
