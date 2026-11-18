import { describe, expect, it } from "vitest";
import { resolveSessionGate } from "../src/lib/session-gate";

const base = { isLoading: false, isFetching: false, isError: false, hasUser: false };

describe("session gate", () => {
  it("waits for the initial session request", () => {
    expect(resolveSessionGate({ ...base, isLoading: true, isFetching: true })).toBe("loading");
  });

  it("does not redirect while a cached session error is being refreshed", () => {
    expect(resolveSessionGate({ ...base, isFetching: true, isError: true })).toBe("loading");
  });

  it("redirects only after the session request settles without a user", () => {
    expect(resolveSessionGate(base)).toBe("redirect");
    expect(resolveSessionGate({ ...base, isError: true })).toBe("redirect");
  });

  it("renders the app once a user is available", () => {
    expect(resolveSessionGate({ ...base, hasUser: true })).toBe("ready");
    expect(resolveSessionGate({ ...base, hasUser: true, isFetching: true })).toBe("ready");
  });
});
