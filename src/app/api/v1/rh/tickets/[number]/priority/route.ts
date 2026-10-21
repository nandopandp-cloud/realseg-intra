import type { z } from "zod";
import { agentPrioritySchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { parseTicketNumber } from "@/server/http/params";
import { agentChangePriority } from "@/server/services/tickets";

export const POST = authed<{ number: string }, z.infer<typeof agentPrioritySchema>>({ permission: "ticket:manage", body: agentPrioritySchema },
  async ({ actor, meta, params, body }) => {
    await agentChangePriority({ actor, meta }, parseTicketNumber(params.number), body.priority);
  },
);
