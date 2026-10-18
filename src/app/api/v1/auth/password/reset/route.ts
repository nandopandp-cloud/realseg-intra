import { resetPasswordSchema } from "@/lib/validation/auth";
import { publicRoute } from "@/server/http/route";
import { resetPassword } from "@/server/services/auth";

export const POST = publicRoute({ body: resetPasswordSchema }, async ({ body, meta }) => {
  await resetPassword(body, meta);
  return { ok: true };
});
