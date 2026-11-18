import { afterAll, beforeAll } from "vitest";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../../src/config/db.js";

export const testUri = process.env.MONGODB_URI_TEST;
export const hasTestDatabase = Boolean(testUri);
export const describeWithDb = hasTestDatabase ? describe : describe.skip;

beforeAll(async () => {
  if (!testUri) return;
  await connectDb(testUri);
});

afterAll(async () => {
  if (!testUri) return;
  await mongoose.connection.dropDatabase();
  await disconnectDb();
});
