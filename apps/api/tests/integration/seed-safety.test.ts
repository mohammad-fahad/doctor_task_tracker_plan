import { afterEach, beforeAll, expect, it } from "vitest";
import mongoose from "mongoose";
import { Doctor } from "../../src/models/Doctor.js";
import { Patient } from "../../src/models/Patient.js";
import { runDemoSeed } from "../../src/scripts/seed-demo.js";
import { describeWithDb } from "./setup.js";

describeWithDb("demo seed data safety", () => {
  const outsideId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
  });

  afterEach(async () => {
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
  });

  it("is idempotent and leaves non-demo records untouched", async () => {
    await Doctor.create({
      _id: outsideId,
      name: "Dr. Outside Data",
      specialization: "Surgery",
      hospital: "Real Hospital",
      phone: "555-0000",
      email: "outside@example.com",
      nameNormalized: "dr outside data",
      specializationNormalized: "surgery",
      hospitalNormalized: "real hospital",
    });

    const first = await runDemoSeed();
    const doctorCountAfterFirst = await Doctor.countDocuments({});
    const patientCountAfterFirst = await Patient.countDocuments({});

    const second = await runDemoSeed();
    expect(second).toEqual(first);
    expect(await Doctor.countDocuments({})).toBe(doctorCountAfterFirst);
    expect(await Patient.countDocuments({})).toBe(patientCountAfterFirst);
    expect(await Doctor.exists({ _id: outsideId })).toBeTruthy();
  });

  it("reset removes only deterministic demo records", async () => {
    const expectedDatabase = mongoose.connection.db!.databaseName;
    await runDemoSeed({ expectedDatabase });
    const before = await Doctor.countDocuments({});
    expect(before).toBeGreaterThan(0);

    const result = await runDemoSeed({ reset: true, expectedDatabase });
    expect(result.doctors).toBe(before);
    expect(await Doctor.countDocuments({})).toBe(before);
  });

  it("rejects a mismatched database target before any destructive operation", async () => {
    await expect(runDemoSeed({ reset: true, expectedDatabase: "some-other-demo-db" })).rejects.toThrow(
      /does not match confirmed database/
    );
  });
});
