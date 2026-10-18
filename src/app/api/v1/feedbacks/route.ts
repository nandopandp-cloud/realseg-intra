import { authed } from "@/server/http/route";
import { listMyFeedbacks } from "@/server/services/feedbacks";

export const GET = authed({ permission: "feedback:read:own" }, async ({ actor, meta }) => ({ items: await listMyFeedbacks({ actor, meta }) }));
