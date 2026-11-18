import { describe, it, expect } from "vitest";
import { buildDoctorFilter, buildPatientFilter } from "../src/utils/queryBuilders.js";
import { parsePagination } from "../src/utils/pagination.js";

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
    const filter: any = buildDoctorFilter({ search: "  CarDio  ", specialization: "Cardiology", hospital: "General Hospital" });
    expect(filter.specializationNormalized).toBe("cardiology");
    expect(filter.hospitalNormalized).toBe("general hospital");
    expect(filter.$or).toHaveLength(3);
  });

  it("builds date range filter", () => {
    const filter: any = buildDoctorFilter({ from: "2026-01-01", to: "2026-01-31" });
    expect(filter.createdAt.$gte).toBeInstanceOf(Date);
    expect(filter.createdAt.$lte).toBeInstanceOf(Date);
  });
});

describe("patient filters", () => {
  it("builds search/condition filters", () => {
    const filter: any = buildPatientFilter({ search: "john", condition: "Asthma" });
    expect(filter.conditionNormalized).toBe("asthma");
    expect(filter.$or).toHaveLength(3);
  });
});
