import { authed } from "@/server/http/route";
import { listMyCertificates } from "@/server/services/courses";

export const GET = authed({ permission: "course:read" }, async ({ actor, meta }) => ({ items: await listMyCertificates({ actor, meta }) }));
