import { authed, parseId } from "@/server/http/route";
import { withdrawApplication } from "@/server/services/career";

export const POST = authed<{ id: string }>({ permission: "opportunity:apply" }, async ({ actor, meta, params }) => {
  await withdrawApplication({ actor, meta }, parseId(params.id, "Oportunidade"));
});
