import type { z } from "zod";
import { slaPolicySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { saveSlaPolicy } from "@/server/services/rh/settings";

/** Nova versão de prazo (vale para solicitações abertas daqui em diante). */
export const POST = authed<Record<string, string>, z.infer<typeof slaPolicySchema>>({ permission: "sla:configure", body: slaPolicySchema }, async ({ actor, meta, body }) => {
  const r = await saveSlaPolicy({ actor, meta }, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
