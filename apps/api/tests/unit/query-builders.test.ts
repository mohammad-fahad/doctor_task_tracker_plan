import { describe, it, expect } from "vitest";
import { buildDoctorFilter, buildPatientFilter } from "../../src/utils/queryBuilders.js";
import { parsePagination } from "../../src/utils/pagination.js";

describe("pagination", () => {
  it("uses defaults and bounds", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
    expect(parsePagination({ page: "2", limit: "20" })).toEqual({ page: 2, limit: 20, skip: 20 });
    expect(parsePagination({ page: "0", limit: "999" })).toEqual({ page: 1, limit: 10, skip: 0 });
    expect(parsePagination({ page: "-1", limit: "50" })).toEqual({ page: 1, limit: 50, skip: 0 });
  });
});

describe("doctor filters", () => {
  it("builds search and exact normalized filters", () => {
    const filter = buildDoctorFilter({ search: "  CarDio  ", specialization: "Cardiology", hospital: "General Hospital" });
    expect(filter.specializationNormalized).toBe("cardiology");
    expect(filter.hospitalNormalized).toBe("general hospital");
    expect(filter.$or).toHaveLength(3);
  });

  it("builds date range filter", () => {
    const filter = buildDoctorFilter({ from: "2026-01-01", to: "2026-01-31" });
    const range = filter.createdAt as { $gte: Date; $lte: Date };
    expect(range.$gte).toBeInstanceOf(Date);
    expect(range.$lte).toBeInstanceOf(Date);
  });

  it("uses case-insensitive substring semantics and escapes regex input", () => {
    const filter = buildDoctorFilter({ search: "arDio" });
    const patterns = (filter.$or ?? []) as Array<Record<string, RegExp>>;
    for (const clause of patterns) {
      const rx = Object.values(clause)[0]!;
      expect(rx.test("cardiology")).toBe(true);
      expect(rx.test("CARDIOLOGY")).toBe(true);
      expect(rx.test("orthopedics")).toBe(false);
    }

    const injection = buildDoctorFilter({ search: "a.*b" });
    const injectionClauses = (injection.$or ?? []) as Array<Record<string, RegExp>>;
    const rx = Object.values(injectionClauses[0]!)[0]!;
    expect(rx.test("a.*b")).toBe(true);
    expect(rx.test("axxb")).toBe(false);
  });
});

describe("patient filters", () => {
  it("builds search/condition filters", () => {
    const filter = buildPatientFilter({ search: "john", condition: "Asthma" });
    expect(filter.conditionNormalized).toBe("asthma");
    expect(filter.$or).toHaveLength(3);
  });

  it("matches a substring of name, phone or email", () => {
    const filter = buildPatientFilter({ search: "555" });
    const patterns = (filter.$or ?? []) as Array<Record<string, RegExp>>;
    expect(patterns).toHaveLength(3);
    for (const clause of patterns) {
      expect(Object.values(clause)[0]!.test("555-1200")).toBe(true);
    }
  });
});
