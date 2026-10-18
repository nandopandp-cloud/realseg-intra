import { forgotPasswordSchema } from "@/lib/validation/auth";
import { publicRoute } from "@/server/http/route";
import { requestPasswordReset } from "@/server/services/auth";

/** Resposta idêntica exista ou não o e-mail (evita enumeração de contas). */
export const POST = publicRoute({ body: forgotPasswordSchema }, async ({ body, meta }) => {
  await requestPasswordReset(body.email, meta);
  return { ok: true };
});
