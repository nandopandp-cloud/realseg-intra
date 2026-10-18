import { authed } from "@/server/http/route";
import { notFound } from "@/server/errors";
import { revokeMySession } from "@/server/services/profile";

export const DELETE = authed<{ id: string }>({ permission: "profile:update:own" }, async ({ actor, meta, params }) => {
  if (!/^[0-9a-f]{16}$/.test(params.id)) throw notFound("Sessão");
  await revokeMySession({ actor, meta }, params.id);
});
