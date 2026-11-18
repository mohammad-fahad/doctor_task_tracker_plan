import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-at-least-16-chars";
  process.env.COOKIE_NAME = process.env.COOKIE_NAME || "dt_token";
});
afterAll(() => {});
