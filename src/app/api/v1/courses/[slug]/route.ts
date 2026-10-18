import { authed } from "@/server/http/route";
import { parseSlug } from "@/server/http/params";
import { getCourse } from "@/server/services/courses";

export const GET = authed<{ slug: string }>({ permission: "course:read" }, async ({ actor, meta, params }) => getCourse({ actor, meta }, parseSlug(params.slug, "Curso")));
