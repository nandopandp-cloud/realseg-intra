import { authed, parseId } from "@/server/http/route";
import { getMySubmission } from "@/server/services/documents";

export const GET = authed<{ id: string }>({ permission: "document:submit:own" }, async ({ actor, meta, params }) => getMySubmission({ actor, meta }, parseId(params.id, "Envio")));
