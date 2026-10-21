import type { z } from "zod";
import { agentAssignSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { agentAssign } from "@/server/services/tickets";

export const POST = authed<{ number: string }, z.infer<typeof agentAssignSchema>>({ permission: "ticket:manage", body: agentAssignSchema }, async ({ actor, meta, params, body }) => {
  await agentAssign({ actor, meta }, parseTicketNumber(params.number), body.assigneeUserId);
});
