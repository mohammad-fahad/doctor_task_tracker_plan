import mongoose from "mongoose";
import { env } from "./env.js";

let connectPromise: Promise<typeof mongoose> | null = null;

export async function connectDb(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  if (!uri) {
    throw new Error("Database connection failed: MONGODB_URI is not configured");
  }
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectPromise) return connectPromise;

  mongoose.set("strictQuery", true);
  connectPromise = mongoose.connect(uri).catch((err) => {
    connectPromise = null;
    const message = err instanceof Error ? err.message : "Unknown database connection error";
    throw new Error(`Database connection failed: ${message}`);
  });

  try {
    return await connectPromise;
  } catch (err) {
    throw err;
  }
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connectPromise = null;
}
