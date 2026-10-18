import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Ctx } from "./actor";
import { SESSION_COOKIE, validateSessionToken, type SessionValidation } from "./session";
import { requestMeta } from "../http/meta";

/** Valida a sessão uma vez por requisição (React cache). */
export const getSessionState = cache(async (): Promise<SessionValidation | { status: "none" }> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { status: "none" };
  return validateSessionToken(token);
});

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.startsWith("/api")) return "/";
  return value;
}

/** Exige sessão válida em páginas; caso contrário redireciona ao login preservando o destino. */
export async function requireCtx(): Promise<Ctx> {
  const state = await getSessionState();
  const h = await headers();
  if (state.status === "valid") return { actor: state.actor, meta: requestMeta(h) };
  const next = encodeURIComponent(safeNext(h.get("x-pathname")));
  redirect(state.status === "expired" ? `/login?motivo=sessao-expirada&next=${next}` : `/login?next=${next}`);
}
