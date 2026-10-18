import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/recuperar-senha", "/redefinir-senha"];

function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Atributos style= (larguras de progresso) exigem 'unsafe-inline'; scripts seguem restritos por nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Proxy (antigo middleware): CSP com nonce por requisição e redirecionamento otimista ao login.
 * A autorização real acontece no servidor (layouts, serviços e Route Handlers) — ADR-0004.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !request.cookies.has("rs_session")) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-pathname", pathname + search);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images|brand|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
