import { authed, parseId } from "@/server/http/route";
import { archiveFeedback } from "@/server/services/rh/feedbacks";

export const POST = authed<{ id: string }>({ permission: "feedback:write:any" }, async ({ actor, meta, params }) => archiveFeedback({ actor, meta }, parseId(params.id, "Feedback")));
