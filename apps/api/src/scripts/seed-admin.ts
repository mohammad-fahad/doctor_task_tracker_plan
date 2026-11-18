import { connectDb, disconnectDb } from "../config/db.js";
import { assertRuntimeEnv } from "../config/env.js";
import { ensureAdminSeed } from "../services/auth.service.js";

async function main() {
  assertRuntimeEnv();
  await connectDb();
  const result = await ensureAdminSeed();
  console.log(result.created ? `Admin created: ${result.email}` : `Admin already exists: ${result.email}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb().catch(() => {});
  });
