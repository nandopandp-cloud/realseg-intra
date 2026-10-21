import { authed, parseId } from "@/server/http/route";
import { publishFeedback } from "@/server/services/rh/feedbacks";

export const POST = authed<{ id: string }>({ permission: "feedback:write:any" }, async ({ actor, meta, params }) => {
  await publishFeedback({ actor, meta }, parseId(params.id, "Feedback"));
});
