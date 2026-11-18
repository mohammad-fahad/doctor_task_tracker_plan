import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function cookieName() {
  return process.env.COOKIE_NAME || "dt_token";
}

function hasSessionToken(request: NextRequest) {
  const name = cookieName();
  const configured = request.cookies.get(name)?.value;
  const legacy = name === "dt_token" ? undefined : request.cookies.get("dt_token")?.value;
  return Boolean(configured || legacy);
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login" && hasSessionToken(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login"],
};
