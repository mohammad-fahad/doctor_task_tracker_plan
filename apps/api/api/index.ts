import type { Request, Response } from "express";
import { createApp } from "../src/app.js";
import { assertRuntimeEnv } from "../src/config/env.js";
import { connectDb } from "../src/config/db.js";

assertRuntimeEnv();

const app = createApp();
let dbReady: Promise<void> | null = null;

async function ensureDb() {
  if (!dbReady) {
    dbReady = connectDb()
      .then(() => undefined)
      .catch((err: unknown) => {
        dbReady = null;
        throw err;
      });
  }
  return dbReady;
}

export default async function handler(req: Request, res: Response) {
  const pathname = (req.url ?? "").split("?")[0]?.replace(/\/+$/, "") ?? "";
  const isLiveness = pathname === "/health" || pathname.endsWith("/health");
  if (!isLiveness) {
    try {
      await ensureDb();
    } catch (err) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message: "Database unavailable",
          ...(process.env.NODE_ENV !== "production" ? { details: err instanceof Error ? err.message : String(err) } : {}),
        })
      );
      return;
    }
  }
  return app(req, res);
}
