import { describe, it, expect } from "vitest";
import { ApiConfigurationError, assertApiBaseUrl, joinApiUrl, resolveApiBaseUrl } from "../src/lib/api-config";

describe("API base URL configuration", () => {
  it("uses localhost fallback outside production", () => {
    expect(resolveApiBaseUrl(undefined, "development")).toBe("http://localhost:4000/api/v1");
    expect(resolveApiBaseUrl("", undefined)).toBe("http://localhost:4000/api/v1");
  });

  it("defers missing production configuration to a clear runtime error", () => {
    expect(resolveApiBaseUrl(undefined, "production")).toBeUndefined();
    expect(resolveApiBaseUrl("   ", "production")).toBeUndefined();
    expect(() => assertApiBaseUrl(undefined, "production")).toThrow(ApiConfigurationError);
    expect(() => assertApiBaseUrl("   ", "production")).toThrow(/must be set in production/);
  });

  it("accepts and normalizes a valid absolute URL", () => {
    expect(assertApiBaseUrl("https://api.example.com/api/v1///", "production")).toBe(
      "https://api.example.com/api/v1"
    );
  });

  it("rejects malformed, non-http and production-localhost URLs when requested", () => {
    expect(() => assertApiBaseUrl("not a url", "development")).toThrow(/absolute http\(s\) URL/);
    expect(() => assertApiBaseUrl("ftp://example.com/api", "development")).toThrow(/http or https/);
    expect(() => assertApiBaseUrl("http://localhost:4000/api/v1", "production")).toThrow(/localhost/);
  });

  it("composes paths without duplicate separators", () => {
    expect(joinApiUrl("https://api.example.com/api/v1/", "/doctors?page=2")).toBe(
      "https://api.example.com/api/v1/doctors?page=2"
    );
  });
});
