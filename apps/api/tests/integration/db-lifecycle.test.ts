import { beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectDb, connectionState, disconnectDb, isDbHealthy } from "../../src/config/db.js";
import { describeWithDb, testUri } from "./setup.js";

const app = createApp();

describeWithDb("readiness and database lifecycle", () => {
  beforeAll(async () => {
    if (testUri) await connectDb(testUri);
  });

  it("liveness responds without a database check", async () => {
    await request(app).get("/api/v1/health").expect(200);
  });

  it("readiness reflects a genuine database ping", async () => {
    const response = await request(app).get("/api/v1/ready").expect(200);
    expect(response.body.data).toMatchObject({ status: "ready", database: "connected" });
    expect(await isDbHealthy()).toBe(true);
  });

  it("readiness reports 503 after disconnection", async () => {
    await disconnectDb();
    expect(connectionState()).toBe(0);
    expect(await isDbHealthy()).toBe(false);
    const response = await request(app).get("/api/v1/ready").expect(503);
    expect(response.body.success).toBe(false);
    await connectDb(testUri);
    expect(await isDbHealthy()).toBe(true);
  });

  it("failed initialization can be retried", async () => {
    await disconnectDb();
    const badUri = "mongodb://127.0.0.1:1/unreachable?serverSelectionTimeoutMS=100";
    await expect(connectDb(badUri)).rejects.toThrow(/Database connection failed/);
    await connectDb(testUri!);
    expect(await isDbHealthy()).toBe(true);
  });

  it("concurrent initialization shares a single attempt", async () => {
    await disconnectDb();
    const connectSpy = vi.spyOn(mongoose, "connect");
    const [a, b, c] = await Promise.all([
      connectDb(testUri),
      connectDb(testUri),
      connectDb(testUri),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(connectSpy).toHaveBeenCalledTimes(1);
    connectSpy.mockRestore();
  });
});
