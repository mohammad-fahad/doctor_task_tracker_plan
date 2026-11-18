import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const mockUser = { _id: "507f1f77bcf86cd799439099", email: "admin@example.com", role: "admin" };

vi.mock("../../src/models/User.js", () => ({
  User: {
    findById: vi.fn(() => ({
      select: () => ({ lean: async () => mockUser }),
    })),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../../src/services/auth.service.js", async () => {
  const { ApiError } = await import("../../src/utils/ApiError.js");
  return {
    authenticateAdmin: vi.fn(async (email: string, password: string) => {
      if (email !== "admin@example.com" || password !== "correct-password") {
        throw new ApiError(401, "Invalid email or password");
      }
      return { token: "signed-token", user: mockUser };
    }),
    ensureAdminSeed: vi.fn(),
  };
});

vi.mock("../../src/services/doctor.service.js", () => ({
  createDoctor: vi.fn(async (input: object) => ({ id: "507f1f77bcf86cd799439011", ...input })),
  listDoctors: vi.fn(async (query: object) => ({
    data: [{ id: "507f1f77bcf86cd799439011" }],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    received: query,
  })),
  getDoctorById: vi.fn(async (id: string) => ({ id })),
  getDoctorFilterOptions: vi.fn(async () => ({ specializations: [], hospitals: [] })),
}));

vi.mock("../../src/services/patient.service.js", () => ({
  createPatient: vi.fn(async (input: object) => ({ id: "507f1f77bcf86cd799439012", ...input })),
  listPatients: vi.fn(async (query: object, doctorId?: string) => ({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    received: { query, doctorId },
  })),
  getPatientById: vi.fn(async (id: string) => ({ id })),
  updatePatient: vi.fn(async (id: string, input: object) => ({ id, ...input })),
  deletePatient: vi.fn(async (id: string) => ({ id })),
}));

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";

const app = createApp();
const token = jwt.sign({ sub: mockUser._id, role: "admin" }, env.JWT_SECRET, { expiresIn: "1h" });
const cookie = `${env.COOKIE_NAME}=${token}`;

const validDoctor = {
  name: "Dr. Jane Doe",
  specialization: "Cardiology",
  hospital: "General Hospital",
  phone: "555-0100",
  email: "jane@example.com",
};

describe("validated Express 5 routes", () => {
  it("requires authentication for protected routes", async () => {
    await request(app).get("/api/v1/doctors").expect(401);
  });

  it("rejects invalid JWT cookies", async () => {
    await request(app).get("/api/v1/doctors").set("Cookie", `${env.COOKIE_NAME}=garbage`).expect(401);
  });

  it("accepts a valid cookie and returns the current user", async () => {
    const response = await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(200);
    expect(response.body.data.user.email).toBe(mockUser.email);
  });

  it("validates login body and clears cookie on logout", async () => {
    await request(app).post("/api/v1/auth/login").send({ email: "bad" }).expect(400);
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@example.com", password: "correct-password" })
      .expect(200);
    const logout = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie).expect(200);
    expect(logout.headers["set-cookie"]?.[0]).toContain(`${env.COOKIE_NAME}=;`);
  });

  it("validates doctor body and consumes validated data", async () => {
    const invalid = await request(app).post("/api/v1/doctors").set("Cookie", cookie).send({ name: "X" }).expect(400);
    expect(invalid.body.message).toBe("Validation failed");

    const created = await request(app)
      .post("/api/v1/doctors")
      .set("Cookie", cookie)
      .send(validDoctor)
      .expect(201);
    expect(created.body.data.name).toBe(validDoctor.name);
  });

  it("validates query independently of req.query getter behaviour", async () => {
    await request(app).get("/api/v1/doctors?sort=invalid").set("Cookie", cookie).expect(400);
    const response = await request(app).get("/api/v1/doctors?page=2&limit=5").set("Cookie", cookie).expect(200);
    expect(response.body.received).toMatchObject({ page: "2", limit: "5" });
  });

  it("validates params and invalid object ids", async () => {
    await request(app).get("/api/v1/doctors/not-an-id").set("Cookie", cookie).expect(400);
    await request(app).get("/api/v1/doctors/507f1f77bcf86cd799439011").set("Cookie", cookie).expect(200);
  });

  it("preserves both params and query validation data when chained", async () => {
    const id = "507f1f77bcf86cd799439011";
    const response = await request(app)
      .get(`/api/v1/doctors/${id}/patients?page=3&sort=oldest`)
      .set("Cookie", cookie)
      .expect(200);
    expect(response.body.received.doctorId).toBe(id);
    expect(response.body.received.query).toMatchObject({ page: "3", sort: "oldest" });

    await request(app).get(`/api/v1/doctors/${id}/patients?sort=bad`).set("Cookie", cookie).expect(400);
  });

  it("validates patient body and params on PATCH", async () => {
    const id = "507f1f77bcf86cd799439012";
    await request(app).patch(`/api/v1/patients/${id}`).set("Cookie", cookie).send({}).expect(400);
    await request(app).patch(`/api/v1/patients/${id}`).set("Cookie", cookie).send({ age: 35 }).expect(200);
    await request(app).patch("/api/v1/patients/bad-id").set("Cookie", cookie).send({ age: 35 }).expect(400);
  });
});
