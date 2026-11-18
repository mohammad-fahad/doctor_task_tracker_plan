import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env, assertRuntimeEnv } from "./config/env.js";

async function start() {
  assertRuntimeEnv();
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err instanceof Error ? err.message : err);
  process.exit(1);
});
