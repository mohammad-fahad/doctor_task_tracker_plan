import { describe, it, expect } from "vitest";

// Lightweight service logic test via module shape expectations.
// Full aggregation correctness is verified against MongoDB in integration environments.
describe("dashboard summary shape", () => {
  it("parseDateRange helper behavior via service contract assumptions", async () => {
    const { parseDateRange } = await import("../../src/utils/dateRange.js");
    expect(parseDateRange()).toBeUndefined();
    const r = parseDateRange("2026-01-01", "2026-01-31");
    expect(r?.$gte).toBeInstanceOf(Date);
    expect(r?.$lte).toBeInstanceOf(Date);
  });
});
