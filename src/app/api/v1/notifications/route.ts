import { z } from "zod";
import { authed, paginationQuery } from "@/server/http/route";
import { listNotifications } from "@/server/services/notifications";

const query = z.object({ filter: z.enum(["all", "unread"]).default("all"), ...paginationQuery });

export const GET = authed({ permission: "notification:read:own", query }, async ({ actor, meta, query }) => listNotifications({ actor, meta }, query));
