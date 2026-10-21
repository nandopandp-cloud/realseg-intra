import type { z } from "zod";
import { feedbackSchema } from "@/lib/validation/rh";
import { authed, parseId } from "@/server/http/route";
import { updateFeedback } from "@/server/services/rh/feedbacks";

export const PUT = authed<{ id: string }, z.infer<typeof feedbackSchema>>({ permission: "feedback:write:any", body: feedbackSchema }, async ({ actor, meta, params, body }) => {
  await updateFeedback({ actor, meta }, parseId(params.id, "Feedback"), body);
});
