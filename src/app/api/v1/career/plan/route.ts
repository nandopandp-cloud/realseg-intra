import { authed } from "@/server/http/route";
import { careerPlan } from "@/server/services/career";

/** Cargos da família do colaborador com faixas PUBLICADAS e vigentes (sem dados individuais). */
export const GET = authed({ permission: "career:read" }, async ({ actor, meta }) => careerPlan({ actor, meta }));
