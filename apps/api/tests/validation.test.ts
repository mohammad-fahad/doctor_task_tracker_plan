import { describe, it, expect } from "vitest";
import { loginSchema } from "../src/validators/auth.js";
import { createDoctorSchema } from "../src/validators/doctor.js";
import { createPatientSchema, updatePatientSchema } from "../src/validators/patient.js";

describe("auth validation", () => {
  it("accepts valid login payload", () => {
    const res = loginSchema.safeParse({ email: "admin@example.com", password: "secret" });
    expect(res.success).toBe(true);
  });

  it("rejects invalid login payload", () => {
    const res = loginSchema.safeParse({ email: "bad", password: "" });
    expect(res.success).toBe(false);
  });
});

describe("doctor validation", () => {
  it("accepts valid doctor payload", () => {
    const res = createDoctorSchema.safeParse({
      name: "Dr. Jane Doe",
      specialization: "Cardiology",
      hospital: "General Hospital",
      phone: "555-0100",
      email: "jane@example.com",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid doctor payload", () => {
    const res = createDoctorSchema.safeParse({ name: "D", specialization: "", hospital: "", phone: "1", email: "nope" });
    expect(res.success).toBe(false);
  });
});

describe("patient validation", () => {
  it("accepts valid patient payload", () => {
    const res = createPatientSchema.safeParse({
      name: "John Smith",
      doctorId: "507f1f77bcf86cd799439011",
      age: 34,
      gender: "male",
      condition: "Asthma",
      phone: "555-1234",
      email: "john@example.com",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid/nonexistent-format doctor reference", () => {
    const res = createPatientSchema.safeParse({
      name: "John Smith",
      doctorId: "not-an-id",
      age: 34,
      gender: "male",
      condition: "Asthma",
      phone: "555-1234",
    });
    expect(res.success).toBe(false);
  });

  it("rejects empty patient update", () => {
    const res = updatePatientSchema.safeParse({});
    expect(res.success).toBe(false);
  });

  it("accepts partial patient update", () => {
    const res = updatePatientSchema.safeParse({ condition: "Recovered", age: 35 });
    expect(res.success).toBe(true);
  });
});
