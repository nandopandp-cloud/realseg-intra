import { authed, parseId } from "@/server/http/route";
import { completeLesson } from "@/server/services/courses";

/** Conclusão idempotente de aula; recalcula progresso e emite certificado quando aplicável. */
export const POST = authed<{ id: string }>({ permission: "course:enroll" }, async ({ actor, meta, params }) => completeLesson({ actor, meta }, parseId(params.id, "Aula")));
