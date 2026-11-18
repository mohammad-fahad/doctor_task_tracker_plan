import { createApp } from "../src/app.js";
import { connectDb } from "../src/config/db.js";

const app = createApp();
let dbReady: Promise<void> | null = null;

async function ensureDb() {
  if (!dbReady) dbReady = connectDb().then(() => undefined);
  return dbReady;
}

export default async function handler(req: unknown, res: unknown) {
  await ensureDb();
  return (app as any)(req, res);
}
