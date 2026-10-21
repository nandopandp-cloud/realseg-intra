import type { z } from "zod";
import { submissionReviewSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { reviewSubmission } from "@/server/services/rh/documents";

export const POST = authed<{ id: string }, z.infer<typeof submissionReviewSchema>>({ permission: "submission:review", body: submissionReviewSchema }, async ({ actor, meta, params, body }) => {
  const r = await reviewSubmission({ actor, meta }, parseId(params.id, "Envio"), body);
  return { status: r.status, version: r.version };
});
