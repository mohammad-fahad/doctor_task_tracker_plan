import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/env.js", () => ({
  env: { isProduction: true, MONGODB_URI: "mongodb://127.0.0.1:27017/unused_seed_guard_db" },
  assertRuntimeEnv: () => undefined,
}));

const { assertSeedGuards, defaultSeedConfig, parseSeedCliArgs } = await import(
  "../../src/scripts/seed-guards.js"
);

const environment = {
  UAT_SEED_ALLOW_PRODUCTION: "true",
  UAT_SEED_DATABASE: "doctor_tracker_prod",
  UAT_SEED_RESET_PASSWORD: "true",
  UAT_SEED_RESET_DEMO: "true",
};

const productionConfig = {
  ...defaultSeedConfig(),
  scope: "admin" as const,
  production: true,
  confirmProduction: true,
  expectedDatabase: "doctor_tracker_prod",
};

describe("production seed fail-closed guards", () => {
  it("refuses every invocation without the environment opt-in", () => {
    expect(() => assertSeedGuards(productionConfig, {})).toThrow(/UAT_SEED_ALLOW_PRODUCTION=true/);
    expect(() =>
      assertSeedGuards({ ...productionConfig, resetPassword: true, confirmResetPassword: true }, {})
    ).toThrow(/UAT_SEED_ALLOW_PRODUCTION=true/);
  });

  it("refuses when CLI production confirmations are missing", () => {
    expect(() =>
      assertSeedGuards({ ...productionConfig, production: false }, environment)
    ).toThrow(/--production and --confirm-production/);
    expect(() =>
      assertSeedGuards({ ...productionConfig, confirmProduction: false }, environment)
    ).toThrow(/--production and --confirm-production/);
  });

  it("refuses without an exact database name and on environment/CLI mismatch", () => {
    expect(() =>
      assertSeedGuards({ ...productionConfig, expectedDatabase: undefined }, environment)
    ).toThrow(/--database=<exact-database-name>/);
    expect(() =>
      assertSeedGuards({ ...productionConfig, expectedDatabase: "another_db" }, environment)
    ).toThrow(/must exactly match/);
  });

  it("accepts a fully confirmed production bootstrap", () => {
    expect(() => assertSeedGuards(productionConfig, environment)).not.toThrow();
  });

  it("requires explicit password-reset opt-in and confirmation", () => {
    const reset = { ...productionConfig, resetPassword: true };
    expect(() => assertSeedGuards(reset, environment)).toThrow(/confirm-reset-password/);
    expect(() => assertSeedGuards({ ...reset, confirmResetPassword: true }, { ...environment, UAT_SEED_RESET_PASSWORD: undefined })).toThrow(
      /UAT_SEED_RESET_PASSWORD=true/
    );
    expect(() =>
      assertSeedGuards({ ...reset, confirmResetPassword: true }, environment)
    ).not.toThrow();
  });

  it("requires explicit demo-reset opt-in and confirmation", () => {
    const reset = { ...productionConfig, scope: "demo" as const, reset: true, expectedDatabase: "doctor_tracker_prod" };
    expect(() => assertSeedGuards({ ...reset, confirmReset: true }, { ...environment, UAT_SEED_RESET_DEMO: undefined })).toThrow(
      /UAT_SEED_RESET_DEMO=true/
    );
    expect(() => assertSeedGuards(reset, environment)).toThrow(/--confirm-reset/);
    expect(() => assertSeedGuards({ ...reset, confirmReset: true }, environment)).not.toThrow();
  });

  it("parses the deliberate production command flags", () => {
    const config = parseSeedCliArgs([
      "--production",
      "--confirm-production",
      "--database=doctor_tracker_prod",
    ]);
    expect(config.production).toBe(true);
    expect(config.confirmProduction).toBe(true);
    expect(config.expectedDatabase).toBe("doctor_tracker_prod");
  });
});
