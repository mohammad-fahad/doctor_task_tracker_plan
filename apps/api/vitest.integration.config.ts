import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    env: {
      NODE_ENV: "test",
      MONGODB_URI: process.env.MONGODB_URI_TEST ?? "",
      JWT_SECRET: "integration-test-secret-at-least-32-chars",
      COOKIE_NAME: "dt_token",
      ADMIN_EMAIL: "integration.admin@example.com",
      ADMIN_PASSWORD: "IntegrationTest123!",
    },
    testTimeout: 30000,
    fileParallelism: false,
    hookTimeout: 60000,
  },
});
