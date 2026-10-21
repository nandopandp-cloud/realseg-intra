import type { z } from "zod";
import { feedbackCreateSchema } from "@/lib/validation/rh";
import { authed } from "@/server/http/route";
import { createFeedback } from "@/server/services/rh/feedbacks";

export const POST = authed<Record<string, string>, z.infer<typeof feedbackCreateSchema>>({ permission: "feedback:write:any", body: feedbackCreateSchema }, async ({ actor, meta, body }) => {
  const r = await createFeedback({ actor, meta }, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
