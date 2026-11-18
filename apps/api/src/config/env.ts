import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().default(""),
  JWT_SECRET: z.string().default(""),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("dt_token"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional().transform((v) => (v ? v : undefined)),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  ADMIN_PASSWORD: z.string().optional().or(z.literal("")),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

const data = parsed.data;
const jwtSecret = data.JWT_SECRET || (data.NODE_ENV === "test" ? "test-secret-at-least-16-chars" : "");

export const env = {
  ...data,
  JWT_SECRET: jwtSecret,
  ADMIN_EMAIL: data.ADMIN_EMAIL || undefined,
  ADMIN_PASSWORD: data.ADMIN_PASSWORD || undefined,
  corsOrigins: data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test",
};

export function assertRuntimeEnv() {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) throw new Error("JWT_SECRET must be set and at least 16 characters");
}
