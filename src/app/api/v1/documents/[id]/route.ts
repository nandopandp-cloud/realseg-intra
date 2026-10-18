import { authed, parseId } from "@/server/http/route";
import { getDocument } from "@/server/services/documents";

export const GET = authed<{ id: string }>({}, async ({ actor, meta, params }) => getDocument({ actor, meta }, parseId(params.id, "Documento")));
