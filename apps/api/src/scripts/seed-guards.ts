import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";

export type SeedScope = "all" | "admin" | "demo";

export type SeedConfig = {
  scope: SeedScope;
  production: boolean;
  confirmProduction: boolean;
  expectedDatabase: string | undefined;
  reset: boolean;
  removeDemo: boolean;
  confirmReset: boolean;
  resetPassword: boolean;
  confirmResetPassword: boolean;
};

export type SeedEnvironment = Record<string, string | undefined>;

export type SeedSummary = {
  database?: string;
  admin?: { email: string; created: boolean; passwordReset: boolean };
  demo?: { doctors: number; patients: number; reset: boolean; removed: boolean };
};

export const SEED_USAGE = [
  "Usage: npm run seed:uat -- [options]",
  "",
  "Options:",
  "  --admin-only                    Bootstrap/update only the admin account",
  "  --demo-only                     Seed only demo doctors/patients",
  "  --reset                         Remove only seeder-owned demo records before re-seeding",
  "  --remove-demo                   Remove seeder-owned demo records without re-seeding",
  "  --confirm-reset                 Confirm demo reset/removal (required in production)",
  "  --reset-password                Replace the existing admin password hash",
  "  --confirm-reset-password        Confirm an explicit admin password reset",
  "  --database=<name>               Exact MongoDB database name to write to",
  "  --production                    Acknowledge a production execution",
  "  --confirm-production            Final production CLI confirmation",
  "  --help                          Show this help",
].join("\n");

export function defaultSeedConfig(): SeedConfig {
  return {
    scope: "all",
    production: false,
    confirmProduction: false,
    expectedDatabase: undefined,
    reset: false,
    removeDemo: false,
    confirmReset: false,
    resetPassword: false,
    confirmResetPassword: false,
  };
}

export function parseSeedCliArgs(argv: readonly string[]): SeedConfig {
  const config = defaultSeedConfig();
  let scopeProvided = false;

  for (const arg of argv) {
    if (arg === "--admin-only" || arg === "--demo-only") {
      if (scopeProvided) throw new Error("Only one scope option may be provided");
      config.scope = arg === "--admin-only" ? "admin" : "demo";
      scopeProvided = true;
      continue;
    }
    if (arg === "--production") {
      config.production = true;
      continue;
    }
    if (arg === "--confirm-production") {
      config.confirmProduction = true;
      continue;
    }
    if (arg === "--reset") {
      config.reset = true;
      continue;
    }
    if (arg === "--remove-demo") {
      config.removeDemo = true;
      continue;
    }
    if (arg === "--confirm-reset") {
      config.confirmReset = true;
      continue;
    }
    if (arg === "--reset-password") {
      config.resetPassword = true;
      continue;
    }
    if (arg === "--confirm-reset-password") {
      config.confirmResetPassword = true;
      continue;
    }
    if (arg.startsWith("--database=")) {
      const value = arg.slice("--database=".length);
      if (!value) throw new Error("--database requires an exact database name");
      config.expectedDatabase = value;
      continue;
    }
    throw new Error("Unknown seed option; use --help to list supported options");
  }

  return config;
}

function isOptedIn(value: string | undefined): boolean {
  return value === "true";
}

export function assertSeedGuards(
  config: SeedConfig,
  environment: SeedEnvironment = process.env,
  isProduction: boolean = env.isProduction
): void {
  if (config.resetPassword && !config.confirmResetPassword) {
    throw new Error("Admin password reset requires --reset-password together with --confirm-reset-password");
  }
  if (config.reset && config.removeDemo) {
    throw new Error("--reset and --remove-demo cannot be combined");
  }
  if ((config.reset || config.removeDemo) && !config.expectedDatabase) {
    throw new Error("Demo reset/removal requires --database=<exact-database-name> confirmation");
  }
  if (config.expectedDatabase && !/^[A-Za-z0-9_-]+$/.test(config.expectedDatabase)) {
    throw new Error("Expected database name contains invalid characters");
  }

  if (isProduction) {
    if (!isOptedIn(environment.UAT_SEED_ALLOW_PRODUCTION)) {
      throw new Error("Production seeding requires UAT_SEED_ALLOW_PRODUCTION=true in the local shell environment");
    }
    if (!config.production || !config.confirmProduction) {
      throw new Error("Production seeding requires both --production and --confirm-production");
    }
    if (!config.expectedDatabase) {
      throw new Error("Production seeding requires --database=<exact-database-name>");
    }
    if (environment.UAT_SEED_DATABASE !== config.expectedDatabase) {
      throw new Error("UAT_SEED_DATABASE must exactly match --database before production seeding");
    }
    if ((config.reset || config.removeDemo) && !isOptedIn(environment.UAT_SEED_RESET_DEMO)) {
      throw new Error("Production demo reset/removal requires UAT_SEED_RESET_DEMO=true");
    }
    if ((config.reset || config.removeDemo) && !config.confirmReset) {
      throw new Error("Production demo reset/removal requires --confirm-reset");
    }
    if (config.resetPassword && !isOptedIn(environment.UAT_SEED_RESET_PASSWORD)) {
      throw new Error("Production admin password reset requires UAT_SEED_RESET_PASSWORD=true");
    }
    return;
  }

  if (config.production || config.confirmProduction) {
    throw new Error("Production seed options require NODE_ENV=production");
  }
  if (config.expectedDatabase && /prod/i.test(config.expectedDatabase)) {
    throw new Error("Refusing to seed a database whose name looks like production from a non-production process");
  }
}

export function assertDbConfigured(): void {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required for seeding; configure it in apps/api/.env");
  }
}

export function assertAdminCredentials(environment: SeedEnvironment = process.env): void {
  if (!environment.ADMIN_EMAIL) throw new Error("ADMIN_EMAIL is required for admin seeding");
  if (!environment.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is required for admin seeding");
}

export function assertConnectedDatabase(expectedDatabase: string | undefined): string {
  const actual = mongoose.connection.db?.databaseName;
  if (!actual) throw new Error("Seeding requires an active MongoDB connection");
  if (expectedDatabase && actual !== expectedDatabase) {
    throw new Error(
      `Refusing to write: connected database '${actual}' does not match confirmed database '${expectedDatabase}'`
    );
  }
  return actual;
}

export async function withSeedDb<T>(config: SeedConfig, work: (database: string) => Promise<T>): Promise<T> {
  assertSeedGuards(config);
  assertDbConfigured();
  await connectDb();
  const database = assertConnectedDatabase(config.expectedDatabase);
  return work(database);
}

export function formatSeedSummary(summary: SeedSummary): string {
  const lines: string[] = [];
  if (summary.admin) {
    const action = summary.admin.passwordReset
      ? "password reset confirmed"
      : summary.admin.created
        ? "created"
        : "already exists (password unchanged)";
    lines.push(`Admin ${summary.admin.email}: ${action}.`);
  }
  if (summary.demo) {
    lines.push(
      summary.demo.removed
        ? `Demo data: removed ${summary.demo.doctors} doctors and ${summary.demo.patients} patients (seeder-owned IDs only).`
        : `Demo data: ${summary.demo.doctors} doctors and ${summary.demo.patients} patients verified${
            summary.demo.reset ? " after removing only seeder-owned demo records" : ""
          }.`
    );
  }
  if (summary.database) lines.push(`Database: ${summary.database}`);
  return lines.join("\n");
}

export function seedErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Seeding failed";
  if (/database connection failed/i.test(error.message)) {
    return "Database connection failed. Verify MONGODB_URI, network access, and credentials.";
  }
  return error.message;
}

export function isDirectInvocation(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return basename(resolve(entry)).replace(/\.(js|ts)$/, "") === basename(fileURLToPath(moduleUrl)).replace(/\.(js|ts)$/, "");
}
