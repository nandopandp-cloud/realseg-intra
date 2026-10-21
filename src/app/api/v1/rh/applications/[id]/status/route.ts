import type { z } from "zod";
import { applicationStatusSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { setApplicationStatus } from "@/server/services/rh/career";

export const POST = authed<{ id: string }, z.infer<typeof applicationStatusSchema>>({ permission: "career:manage", body: applicationStatusSchema }, async ({ actor, meta, params, body }) => {
  await setApplicationStatus({ actor, meta }, parseId(params.id, "Candidatura"), body.status);
});
