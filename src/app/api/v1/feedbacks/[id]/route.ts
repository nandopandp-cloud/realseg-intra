import { authed, parseId } from "@/server/http/route";
import { getMyFeedback } from "@/server/services/feedbacks";

export const GET = authed<{ id: string }>({ permission: "feedback:read:own" }, async ({ actor, meta, params }) => getMyFeedback({ actor, meta }, parseId(params.id, "Feedback")));
