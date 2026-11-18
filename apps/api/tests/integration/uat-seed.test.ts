import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeEach, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { Doctor } from "../../src/models/Doctor.js";
import { Patient } from "../../src/models/Patient.js";
import { User } from "../../src/models/User.js";
import { ensureAdminSeed } from "../../src/services/auth.service.js";
import { defaultSeedConfig, parseSeedCliArgs } from "../../src/scripts/seed-guards.js";
import { runUatSeed } from "../../src/scripts/seed-uat.js";
import { describeWithDb } from "./setup.js";

describeWithDb("UAT seed workflow", () => {
  const app = createApp();
  const adminEmail = env.ADMIN_EMAIL!;
  const adminPassword = env.ADMIN_PASSWORD!;

  beforeEach(async () => {
    await User.deleteMany({ email: adminEmail });
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: adminEmail });
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
  });

  it("creates the configured admin and allows login", async () => {
    const admin = await ensureAdminSeed();
    expect(admin).toMatchObject({ created: true, passwordReset: false, email: adminEmail });
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
  });

  it("preserves an existing admin and its password on repeated seeds", async () => {
    await ensureAdminSeed();
    const before = await User.findOne({ email: adminEmail }).lean();

    const summary = await runUatSeed();
    expect(summary.admin).toMatchObject({ created: false, passwordReset: false });
    const after = await User.findOne({ email: adminEmail }).lean();
    expect(after?.passwordHash).toBe(before?.passwordHash);
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
  });

  it("changes an existing admin password only with explicit confirmation", async () => {
    await ensureAdminSeed();
    const rotatedPassword = `${adminPassword}-rotated`;
    await User.updateOne(
      { email: adminEmail },
      { $set: { passwordHash: await bcrypt.hash(rotatedPassword, 4) } }
    );

    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: rotatedPassword })
      .expect(200);

    await expect(
      runUatSeed({ ...defaultSeedConfig(), resetPassword: true })
    ).rejects.toThrow(/confirm-reset-password/);

    const summary = await runUatSeed(parseSeedCliArgs(["--reset-password", "--confirm-reset-password"]));
    expect(summary.admin).toMatchObject({ created: false, passwordReset: true });
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: rotatedPassword })
      .expect(401);
  });

  it("seeds 12 doctors and 84 patients idempotently without touching unrelated records", async () => {
    const unrelatedDoctor = await Doctor.create({
      name: "Dr. Unrelated",
      specialization: "Surgery",
      hospital: "Private Hospital",
      phone: "555-9999",
      email: "unrelated@example.com",
      nameNormalized: "dr unrelated",
      specializationNormalized: "surgery",
      hospitalNormalized: "private hospital",
    });
    const unrelatedPatient = await Patient.create({
      name: "Real Record",
      doctorId: unrelatedDoctor._id,
      age: 44,
      gender: "other",
      condition: "Checkup",
      phone: "555-9998",
      nameNormalized: "real record",
      conditionNormalized: "checkup",
      phoneNormalized: "555-9998",
    });

    const first = await runUatSeed();
    expect(first.demo).toMatchObject({ doctors: 12, patients: 84, reset: false });
    expect(await Doctor.countDocuments({})).toBe(13);
    expect(await Patient.countDocuments({})).toBe(85);

    const second = await runUatSeed();
    expect(second.demo).toEqual(first.demo);
    expect(await Doctor.countDocuments({})).toBe(13);
    expect(await Patient.countDocuments({})).toBe(85);
    expect(await Doctor.exists({ _id: unrelatedDoctor._id })).toBeTruthy();
    expect(await Patient.exists({ _id: unrelatedPatient._id })).toBeTruthy();
  });

  it("refuses a mismatched database before writing anything", async () => {
    const config = {
      ...defaultSeedConfig(),
      expectedDatabase: "definitely_not_the_connected_db",
    };
    await expect(runUatSeed(config)).rejects.toThrow(/does not match confirmed database/);
    expect(await User.countDocuments({ email: adminEmail })).toBe(0);
    expect(await Doctor.countDocuments({})).toBe(0);
    expect(await Patient.countDocuments({})).toBe(0);
  });

  it("removes only seeder-owned demo records without re-seeding", async () => {
    const unrelatedDoctorId = new mongoose.Types.ObjectId();
    await Doctor.create({
      _id: unrelatedDoctorId,
      name: "Dr. Remain",
      specialization: "Surgery",
      hospital: "Private Hospital",
      phone: "555-7777",
      email: "remain@example.com",
      nameNormalized: "dr remain",
      specializationNormalized: "surgery",
      hospitalNormalized: "private hospital",
    });
    await runUatSeed();
    const database = mongoose.connection.db!.databaseName;

    const summary = await runUatSeed(
      parseSeedCliArgs(["--demo-only", "--remove-demo", "--confirm-reset", `--database=${database}`])
    );
    expect(summary.demo).toMatchObject({ doctors: 12, patients: 84, removed: true });
    expect(await Doctor.countDocuments({})).toBe(1);
    expect(await Patient.countDocuments({})).toBe(0);
    expect(await Doctor.exists({ _id: unrelatedDoctorId })).toBeTruthy();
  });

  it("removes only seeder-owned demo records on an explicit reset", async () => {
    const unrelatedDoctorId = new mongoose.Types.ObjectId();
    await Doctor.create({
      _id: unrelatedDoctorId,
      name: "Dr. Keep Me",
      specialization: "Surgery",
      hospital: "Private Hospital",
      phone: "555-8888",
      email: "keep@example.com",
      nameNormalized: "dr keep me",
      specializationNormalized: "surgery",
      hospitalNormalized: "private hospital",
    });
    await runUatSeed();
    const database = mongoose.connection.db!.databaseName;

    const summary = await runUatSeed(
      parseSeedCliArgs(["--reset", "--confirm-reset", `--database=${database}`])
    );
    expect(summary.demo).toMatchObject({ doctors: 12, patients: 84, reset: true });
    expect(await Doctor.countDocuments({})).toBe(13);
    expect(await Patient.countDocuments({})).toBe(84);
    expect(await Doctor.exists({ _id: unrelatedDoctorId })).toBeTruthy();
  });
});
