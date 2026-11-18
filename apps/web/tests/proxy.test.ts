import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getRedirectUrl } from "next/experimental/testing/server";
import { proxy, config } from "../src/proxy";

function request(path: string, cookies: Record<string, string> = {}) {
  const url = new URL(path, "https://web.example.com");
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value);
  return req;
}

function redirectPath(path: string, cookies: Record<string, string> = {}) {
  const target = getRedirectUrl(proxy(request(path, cookies)));
  return target ? new URL(target) : null;
}

describe("web proxy", () => {
  const originalCookieName = process.env.COOKIE_NAME;

  beforeEach(() => {
    delete process.env.COOKIE_NAME;
  });

  afterEach(() => {
    if (originalCookieName === undefined) delete process.env.COOKIE_NAME;
    else process.env.COOKIE_NAME = originalCookieName;
  });

  it("leaves protected routes to the client-side session check", () => {
    expect(redirectPath("/dashboard")).toBeNull();
    expect(redirectPath("/patients?page=2&search=lee")).toBeNull();
    expect(redirectPath("/doctors/507f1f77bcf86cd799439011")).toBeNull();
  });

  it("redirects authenticated users away from login", () => {
    expect(redirectPath("/login", { dt_token: "jwt" })?.pathname).toBe("/dashboard");
  });

  it("honors a custom cookie name and still accepts the legacy name", () => {
    process.env.COOKIE_NAME = "custom_session";
    expect(redirectPath("/login", { custom_session: "jwt" })?.pathname).toBe("/dashboard");
    expect(redirectPath("/login", { dt_token: "jwt" })?.pathname).toBe("/dashboard");
  });

  it("does not redirect public routes or 404 paths", () => {
    expect(redirectPath("/login")).toBeNull();
    expect(redirectPath("/some-missing-page")).toBeNull();
  });

  it("uses the expected matcher", () => {
    expect(config.matcher).toEqual(["/login"]);
  });
});
