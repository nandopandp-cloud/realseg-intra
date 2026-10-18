import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session";
import { authed } from "@/server/http/route";
import { logout } from "@/server/services/auth";

export const POST = authed({}, async ({ actor, meta }) => {
  await logout({ actor, meta });
  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
