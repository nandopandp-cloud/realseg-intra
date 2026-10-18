import { authed, parseId } from "@/server/http/route";
import { acknowledgeFeedback } from "@/server/services/feedbacks";

export const POST = authed<{ id: string }>({ permission: "feedback:acknowledge:own" }, async ({ actor, meta, params }) => acknowledgeFeedback({ actor, meta }, parseId(params.id, "Feedback")));
