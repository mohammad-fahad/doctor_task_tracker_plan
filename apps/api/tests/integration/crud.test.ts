import { afterEach, beforeAll, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Doctor } from "../../src/models/Doctor.js";
import { Patient } from "../../src/models/Patient.js";
import { describeWithDb } from "./setup.js";

const app = createApp();
const adminEmail = "integration.admin@example.com";
const adminPassword = "integration-password-123";

let cookie = "";

describeWithDb("API integration: auth, CRUD, pagination and search", () => {
  beforeAll(async () => {
    await User.deleteMany({ email: adminEmail });
    await User.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 4),
      role: "admin",
    });
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    cookie = response.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
  });

  afterEach(async () => {
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
  });

  it("rejects unauthenticated requests and accepts a valid session", async () => {
    await request(app).get("/api/v1/doctors").expect(401);
    await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(200);
  });

  it("rejects invalid credentials and invalid JWT cookies", async () => {
    await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "wrong" }).expect(401);
    await request(app).get("/api/v1/doctors").set("Cookie", "dt_token=not-a-jwt").expect(401);
  });

  it("logs out by clearing the cookie", async () => {
    const response = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie).expect(200);
    expect(response.headers["set-cookie"]?.[0]).toMatch(/dt_token=;/);
  });

  it("validates doctor body and creates/lists/gets a doctor", async () => {
    await request(app).post("/api/v1/doctors").set("Cookie", cookie).send({ name: "X" }).expect(400);
    const created = await request(app)
      .post("/api/v1/doctors")
      .set("Cookie", cookie)
      .send({
        name: "Dr. Jane Doe",
        specialization: "Cardiology",
        hospital: "General Hospital",
        phone: "555-0100",
        email: "jane@example.com",
      })
      .expect(201);
    expect(created.body.data.id).toBeTruthy();

    const listed = await request(app).get("/api/v1/doctors?search=cardio").set("Cookie", cookie).expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.pagination.total).toBe(1);

    await request(app).get(`/api/v1/doctors/${created.body.data.id}`).set("Cookie", cookie).expect(200);
    await request(app).get("/api/v1/doctors/not-an-id").set("Cookie", cookie).expect(400);
  });

  it("validates query and params together on doctor patients route", async () => {
    const doctor = await Doctor.create({
      name: "Dr. Query Test",
      specialization: "Neurology",
      hospital: "Test Hospital",
      phone: "555-0199",
      email: "query@example.com",
      nameNormalized: "dr query test",
      specializationNormalized: "neurology",
      hospitalNormalized: "test hospital",
    });
    await request(app)
      .get(`/api/v1/doctors/${doctor.id}/patients?page=abc&sort=oldest`)
      .set("Cookie", cookie)
      .expect(200);
    await request(app).get("/api/v1/doctors/nope/patients?page=abc").set("Cookie", cookie).expect(400);
    await request(app).get(`/api/v1/doctors/${doctor.id}/patients?page=1&sort=invalid`).set("Cookie", cookie).expect(400);
  });

  it("creates, updates and deletes patients with doctor validation", async () => {
    const doctor = await Doctor.create({
      name: "Dr. Patient Test",
      specialization: "Pediatrics",
      hospital: "Childrens Hospital",
      phone: "555-0188",
      email: "patient.doc@example.com",
      nameNormalized: "dr patient test",
      specializationNormalized: "pediatrics",
      hospitalNormalized: "childrens hospital",
    });
    const created = await request(app)
      .post("/api/v1/patients")
      .set("Cookie", cookie)
      .send({
        name: "John Smith",
        doctorId: String(doctor._id),
        age: 34,
        gender: "male",
        condition: "Asthma",
        phone: "555-1234",
        email: "john@example.com",
      })
      .expect(201);
    const id = created.body.data.id;

    await request(app)
      .patch(`/api/v1/patients/${id}`)
      .set("Cookie", cookie)
      .send({ age: 35 })
      .expect(200);
    await request(app).get(`/api/v1/patients/${id}`).set("Cookie", cookie).expect(200);
    await request(app).delete(`/api/v1/patients/${id}`).set("Cookie", cookie).expect(200);
    await request(app).get(`/api/v1/patients/${id}`).set("Cookie", cookie).expect(404);
  });

  it("leaves email unchanged when omitted, clears it on empty string, and updates it consistently", async () => {
    const doctor = await Doctor.create({
      name: "Dr. Email Test",
      specialization: "General",
      hospital: "Test Hospital",
      phone: "555-0177",
      email: "email.doc@example.com",
      nameNormalized: "dr email test",
      specializationNormalized: "general",
      hospitalNormalized: "test hospital",
    });
    const created = await request(app)
      .post("/api/v1/patients")
      .set("Cookie", cookie)
      .send({
        name: "Email Subject",
        doctorId: String(doctor._id),
        age: 40,
        gender: "other",
        condition: "Checkup",
        phone: "555-1777",
        email: "before@example.com",
      })
      .expect(201);
    const id = created.body.data.id;

    await request(app).patch(`/api/v1/patients/${id}`).set("Cookie", cookie).send({ age: 41 }).expect(200);
    let raw = await Patient.findById(new mongoose.Types.ObjectId(id)).lean();
    expect(raw?.email).toBe("before@example.com");
    expect(raw?.emailNormalized).toBe("before@example.com");

    await request(app)
      .patch(`/api/v1/patients/${id}`)
      .set("Cookie", cookie)
      .send({ email: "after@example.com" })
      .expect(200);
    raw = await Patient.findById(new mongoose.Types.ObjectId(id)).lean();
    expect(raw?.email).toBe("after@example.com");
    expect(raw?.emailNormalized).toBe("after@example.com");

    await request(app).patch(`/api/v1/patients/${id}`).set("Cookie", cookie).send({ email: "" }).expect(200);
    raw = await Patient.findById(new mongoose.Types.ObjectId(id)).lean();
    expect(raw?.email).toBeUndefined();
    expect(raw?.emailNormalized).toBeUndefined();
  });

  it("paginates and searches patients", async () => {
    const doctor = await Doctor.create({
      name: "Dr. Pagination",
      specialization: "General",
      hospital: "Test Hospital",
      phone: "555-0166",
      email: "pagination@example.com",
      nameNormalized: "dr pagination",
      specializationNormalized: "general",
      hospitalNormalized: "test hospital",
    });
    for (let i = 0; i < 12; i += 1) {
      await Patient.create({
        name: `Search Subject ${i}`,
        doctorId: doctor._id,
        age: 20 + i,
        gender: "female",
        condition: "Checkup",
        phone: `555-900${i}`,
        nameNormalized: `search subject ${i}`,
        conditionNormalized: "checkup",
        phoneNormalized: `555-900${i}`,
      });
    }
    const page = await request(app)
      .get("/api/v1/patients?search=subject&limit=10&page=2")
      .set("Cookie", cookie)
      .expect(200);
    expect(page.body.data).toHaveLength(2);
    expect(page.body.pagination.total).toBe(12);
    expect(page.body.pagination.page).toBe(2);
  });
});
