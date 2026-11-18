import { describe, expect, it } from "vitest";
import { safeNextPath } from "../src/lib/redirect";

describe("safeNextPath", () => {
  it("keeps local paths with query strings and hashes", () => {
    expect(safeNextPath("/patients?doctorId=123#top")).toBe("/patients?doctorId=123#top");
  });

  it("falls back for absolute URLs, protocol-relative URLs, and backslashes", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.example.com/path")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example.com")).toBe("/dashboard");
  });

  it("uses the supplied fallback for empty values", () => {
    expect(safeNextPath(null, "/doctors")).toBe("/doctors");
    expect(safeNextPath("", "/doctors")).toBe("/doctors");
  });
});
