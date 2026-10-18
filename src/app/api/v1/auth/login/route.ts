import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";
import { publicRoute } from "@/server/http/route";
import { login } from "@/server/services/auth";

export const POST = publicRoute({ body: loginSchema }, async ({ body, meta }) => {
  const session = await login(body, meta);
  const res = NextResponse.json({ ok: true, mustChangePassword: session.mustChangePassword }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
  return res;
});
