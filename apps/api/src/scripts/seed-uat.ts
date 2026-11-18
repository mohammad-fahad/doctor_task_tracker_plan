import { disconnectDb } from "../config/db.js";
import { ensureAdminSeed } from "../services/auth.service.js";
import { seedDemoData } from "./seed-demo.js";
import {
  assertAdminCredentials,
  SEED_USAGE,
  formatSeedSummary,
  isDirectInvocation,
  parseSeedCliArgs,
  seedErrorMessage,
  withSeedDb,
  type SeedConfig,
  type SeedSummary,
} from "./seed-guards.js";

export async function runUatSeed(
  config: SeedConfig = parseSeedCliArgs(process.argv.slice(2))
): Promise<SeedSummary> {
  if (config.scope !== "demo") assertAdminCredentials();

  return withSeedDb(config, async (database) => {
    const summary: SeedSummary = { database };
    if (config.scope !== "demo") {
      summary.admin = await ensureAdminSeed(undefined, undefined, { resetPassword: config.resetPassword });
    }
    if (config.scope !== "admin") {
      const demo = await seedDemoData(config);
      summary.demo = { ...demo, reset: config.reset };
    }
    return summary;
  });
}

if (isDirectInvocation(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(SEED_USAGE);
  } else {
    runUatSeed(parseSeedCliArgs(args))
      .then((summary) => console.log(formatSeedSummary(summary)))
      .catch((err: unknown) => {
        console.error(seedErrorMessage(err));
        process.exitCode = 1;
      })
      .finally(async () => {
        await disconnectDb().catch(() => {});
      });
  }
}
