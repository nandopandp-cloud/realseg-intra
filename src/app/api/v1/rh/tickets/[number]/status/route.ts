import type { z } from "zod";
import { agentStatusSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { agentChangeStatus } from "@/server/services/tickets";

export const POST = authed<{ number: string }, z.infer<typeof agentStatusSchema>>({ permission: "ticket:manage", body: agentStatusSchema },
  async ({ actor, meta, params, body }) => {
    await agentChangeStatus({ actor, meta }, parseTicketNumber(params.number), body.to, body.note || undefined);
  },
);
