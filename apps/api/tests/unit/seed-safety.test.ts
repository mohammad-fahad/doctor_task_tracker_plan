import { describe, expect, it } from "vitest";
import { assertSeedSafety } from "../../src/scripts/seed-demo.js";

describe("demo seed safety (non-production)", () => {
  it("allows a non-destructive run without confirmation", () => {
    expect(() => assertSeedSafety()).not.toThrow();
  });

  it("requires an explicit expected database for destructive reset", () => {
    expect(() => assertSeedSafety({ reset: true })).toThrow(/expectedDatabase confirmation/);
  });

  it("rejects malformed or production-like database names", () => {
    expect(() => assertSeedSafety({ expectedDatabase: "bad name!" })).toThrow(/invalid characters/);
    expect(() => assertSeedSafety({ expectedDatabase: "doctor-tracker-prod" })).toThrow(/looks like production/);
  });
});
