import { describe, expect, it } from "vitest";
import {
  defaultSeedConfig,
  formatSeedSummary,
  parseSeedCliArgs,
  seedErrorMessage,
  assertSeedGuards,
} from "../../src/scripts/seed-guards.js";
import { assertSeedSafety } from "../../src/scripts/seed-demo.js";

describe("seed CLI parsing", () => {
  it("defaults to a full local UAT seed", () => {
    expect(parseSeedCliArgs([])).toEqual(defaultSeedConfig());
  });

  it("parses scope, reset, confirmation and database options", () => {
    const config = parseSeedCliArgs([
      "--admin-only",
      "--reset",
      "--confirm-reset",
      "--reset-password",
      "--confirm-reset-password",
      "--database=doctor_tracker_dev",
    ]);
    expect(config.scope).toBe("admin");
    expect(config.reset).toBe(true);
    expect(config.confirmReset).toBe(true);
    expect(config.resetPassword).toBe(true);
    expect(config.confirmResetPassword).toBe(true);
    expect(config.expectedDatabase).toBe("doctor_tracker_dev");
  });

  it("fails closed on unknown options without echoing supplied values", () => {
    expect(() => parseSeedCliArgs(["--password=super-secret"])).toThrow(
      /unknown seed option/i
    );
    expect(() => parseSeedCliArgs(["--database="])).toThrow(/exact database name/);
  });
});

describe("demo seed safety (non-production)", () => {
  it("allows a non-destructive run without confirmation", () => {
    expect(() => assertSeedSafety()).not.toThrow();
  });

  it("requires an explicit expected database for a demo reset", () => {
    expect(() => assertSeedSafety({ reset: true })).toThrow(/exact-database-name.*confirmation/);
  });

  it("rejects malformed or production-like database names", () => {
    expect(() => assertSeedSafety({ expectedDatabase: "bad name!" })).toThrow(/invalid characters/);
    expect(() => assertSeedSafety({ expectedDatabase: "doctor-tracker-prod" })).toThrow(/looks like production/);
  });

  it("requires an exact database for demo removal and rejects combining reset modes", () => {
    expect(() => assertSeedSafety({ removeDemo: true })).toThrow(/exact-database-name.*confirmation/);
    expect(() =>
      assertSeedSafety({ removeDemo: true, reset: true, expectedDatabase: "doctor_tracker_dev" })
    ).toThrow(/cannot be combined/);
    expect(() =>
      assertSeedSafety({ removeDemo: true, expectedDatabase: "doctor_tracker_dev" })
    ).not.toThrow();
  });

  it("requires both password-reset flags", () => {
    expect(() => assertSeedSafety({ resetPassword: true })).toThrow(/confirm-reset-password/);
    expect(() => assertSeedSafety({ resetPassword: true, confirmResetPassword: true })).not.toThrow();
  });

  it("rejects production flags outside production", () => {
    expect(() => assertSeedGuards({ ...defaultSeedConfig(), production: true }, {})).toThrow(
      /NODE_ENV=production/
    );
    expect(() => assertSeedGuards({ ...defaultSeedConfig(), confirmProduction: true }, {})).toThrow(
      /NODE_ENV=production/
    );
  });
});

describe("seed output safety", () => {
  it("never prints passwords, JWT secrets or MongoDB URIs in completion output", () => {
    const summary = formatSeedSummary({
      database: "doctor_tracker_dev",
      admin: { email: "admin@example.com", created: false, passwordReset: true },
      demo: { doctors: 12, patients: 84, reset: false, removed: false },
    });
    expect(summary).toContain("password reset confirmed");
    expect(summary).not.toMatch(/super-secret|jwt-signing-secret|mongodb(\+srv)?:\/\//i);
  });

  it("sanitizes database connection failures", () => {
    expect(seedErrorMessage(new Error("Database connection failed: mongodb://user:pass@host/db"))).toBe(
      "Database connection failed. Verify MONGODB_URI, network access, and credentials."
    );
  });
});
