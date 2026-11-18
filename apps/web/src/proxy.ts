import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/doctors", "/patients"];

function cookieName(request: NextRequest) {
  return process.env.COOKIE_NAME || "dt_token";
}

function hasSessionToken(request: NextRequest) {
  const name = cookieName(request);
  const configured = request.cookies.get(name)?.value;
  const legacy = name === "dt_token" ? undefined : request.cookies.get("dt_token")?.value;
  return Boolean(configured || legacy);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isLogin = pathname === "/login";
  const authenticated = hasSessionToken(request);

  if (isProtected && !authenticated) {
    const url = new URL("/login", request.url);
    const returnTo = `${pathname}${search}`;
    url.searchParams.set("next", returnTo);
    return NextResponse.redirect(url);
  }
  if (isLogin && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/doctors/:path*", "/patients/:path*"],
};
