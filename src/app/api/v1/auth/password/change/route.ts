import { changePasswordSchema } from "@/lib/validation/auth";
import { authed } from "@/server/http/route";
import { changePassword } from "@/server/services/auth";

export const POST = authed({ permission: "profile:update:own", body: changePasswordSchema }, async ({ actor, meta, body }) => {
  await changePassword({ actor, meta }, body);
  return { ok: true };
});
