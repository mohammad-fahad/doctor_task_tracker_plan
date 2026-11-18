import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/env.js", () => ({
  env: { isProduction: true },
  assertRuntimeEnv: () => undefined,
}));

const { assertSeedSafety } = await import("../../src/scripts/seed-demo.js");

describe("demo seed production fail-closed", () => {
  it("refuses every seed invocation when NODE_ENV is production", () => {
    expect(() => assertSeedSafety()).toThrow(/disabled in production/);
    expect(() => assertSeedSafety({ reset: true, expectedDatabase: "demo-db" })).toThrow(/disabled in production/);
  });
});
