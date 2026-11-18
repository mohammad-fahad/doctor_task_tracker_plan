import { disconnectDb } from "../config/db.js";
import { ensureAdminSeed } from "../services/auth.service.js";
import {
  assertAdminCredentials,
  formatSeedSummary,
  isDirectInvocation,
  parseSeedCliArgs,
  seedErrorMessage,
  withSeedDb,
  type SeedConfig,
} from "./seed-guards.js";

export async function runAdminBootstrap(config: SeedConfig = parseSeedCliArgs(process.argv.slice(2))) {
  const effective: SeedConfig = { ...config, scope: "admin" };
  assertAdminCredentials();
  return withSeedDb(effective, async () =>
    ensureAdminSeed(undefined, undefined, { resetPassword: effective.resetPassword })
  );
}

if (isDirectInvocation(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: npm run seed:admin -- [options] (see npm run seed:uat -- --help)");
  } else {
    runAdminBootstrap()
      .then((admin) => console.log(formatSeedSummary({ admin })))
      .catch((err: unknown) => {
        console.error(seedErrorMessage(err));
        process.exitCode = 1;
      })
      .finally(async () => {
        await disconnectDb().catch(() => {});
      });
  }
}
