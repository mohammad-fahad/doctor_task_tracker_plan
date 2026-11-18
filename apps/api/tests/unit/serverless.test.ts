import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const connectDb = vi.fn();
const assertRuntimeEnv = vi.fn();

vi.mock("../../src/config/db.js", () => ({ connectDb: () => connectDb() }));
vi.mock("../../src/config/env.js", () => ({
  env: { corsOrigins: ["https://web.example.com"], isProduction: false, isTest: true },
  assertRuntimeEnv: () => assertRuntimeEnv(),
}));
vi.mock("../../src/app.js", () => ({
  createApp: () => {
    const app = express();
    app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));
    app.get("/api/v1/protected", (_req, res) => res.json({ ok: true }));
    return app;
  },
}));

describe("serverless API entrypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("validates runtime environment at startup and serves liveness without the database", async () => {
    const { default: handler } = await import("../../api/index.js");
    const response = await request(handler as never).get("/api/v1/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(assertRuntimeEnv).toHaveBeenCalledTimes(1);
    expect(connectDb).not.toHaveBeenCalled();
  });

  it("treats a trailing-slash health path as liveness", async () => {
    const { default: handler } = await import("../../api/index.js");
    await request(handler as never).get("/api/v1/health/").expect(200);
    expect(connectDb).not.toHaveBeenCalled();
  });

  it("returns 503 and allows retry after a failed database initialization", async () => {
    connectDb.mockRejectedValueOnce(new Error("connection refused")).mockResolvedValueOnce(undefined);
    const { default: handler } = await import("../../api/index.js");

    await request(handler as never).get("/api/v1/protected").expect(503);
    await request(handler as never).get("/api/v1/protected").expect(200);
    expect(connectDb).toHaveBeenCalledTimes(2);
  });

  it("shares one connection attempt between concurrent requests", async () => {
    connectDb.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(undefined), 20)));
    const { default: handler } = await import("../../api/index.js");

    await Promise.all([
      request(handler as never).get("/api/v1/protected").expect(200),
      request(handler as never).get("/api/v1/protected").expect(200),
      request(handler as never).get("/api/v1/protected").expect(200),
    ]);
    expect(connectDb).toHaveBeenCalledTimes(1);
  });
});
