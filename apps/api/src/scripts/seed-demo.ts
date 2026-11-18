import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../config/db.js";
import { assertRuntimeEnv, env } from "../config/env.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ensureAdminSeed } from "../services/auth.service.js";
import { normalizeText } from "../utils/normalize.js";

const doctorsSeed = [
  { name: "Dr. Amelia Hart", specialization: "Cardiology", hospital: "Harborview Medical Center", phone: "555-0101", email: "amelia.hart@example.com" },
  { name: "Dr. Noah Bennett", specialization: "Neurology", hospital: "Lakeside General Hospital", phone: "555-0102", email: "noah.bennett@example.com" },
  { name: "Dr. Olivia Chen", specialization: "Pediatrics", hospital: "Cedar Grove Clinic", phone: "555-0103", email: "olivia.chen@example.com" },
  { name: "Dr. Ethan Patel", specialization: "Orthopedics", hospital: "Summit Orthopedic Institute", phone: "555-0104", email: "ethan.patel@example.com" },
  { name: "Dr. Sophia Ramirez", specialization: "Dermatology", hospital: "Westbrook Health Campus", phone: "555-0105", email: "sophia.ramirez@example.com" },
  { name: "Dr. Liam O'Connor", specialization: "Oncology", hospital: "Harborview Medical Center", phone: "555-0106", email: "liam.oconnor@example.com" },
  { name: "Dr. Ava Thompson", specialization: "Endocrinology", hospital: "Lakeside General Hospital", phone: "555-0107", email: "ava.thompson@example.com" },
  { name: "Dr. Mason Lee", specialization: "Gastroenterology", hospital: "Cedar Grove Clinic", phone: "555-0108", email: "mason.lee@example.com" },
  { name: "Dr. Isabella Nguyen", specialization: "Pulmonology", hospital: "Summit Orthopedic Institute", phone: "555-0109", email: "isabella.nguyen@example.com" },
  { name: "Dr. James Walker", specialization: "Psychiatry", hospital: "Westbrook Health Campus", phone: "555-0110", email: "james.walker@example.com" },
  { name: "Dr. Mia Johnson", specialization: "Cardiology", hospital: "Lakeside General Hospital", phone: "555-0111", email: "mia.johnson@example.com" },
  { name: "Dr. Lucas Martin", specialization: "Pediatrics", hospital: "Harborview Medical Center", phone: "555-0112", email: "lucas.martin@example.com" },
] as const;

const firstNames = ["Emma","Liam","Olivia","Noah","Ava","Elijah","Sophia","James","Isabella","William","Mia","Benjamin","Charlotte","Lucas","Amelia","Henry","Harper","Alexander","Evelyn","Michael","Abigail","Daniel","Emily","Matthew"] as const;
const lastNames = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin"] as const;
const genders = ["male", "female", "other"] as const;
const conditions = [
  "Hypertension","Type 2 Diabetes","Asthma","Migraine","Arthritis","Eczema","Anxiety","Back Pain","Allergic Rhinitis","Hypothyroidism",
  "GERD","Coronary Artery Disease","Depression","COPD","Irritable Bowel Syndrome"
] as const;

const PATIENT_COUNT = 84;

export type SeedOptions = {
  reset?: boolean;
  expectedDatabase?: string | undefined;
};

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0);
  return d;
}

function deterministicId(kind: "doctor" | "patient", index: number) {
  const digest = createHash("sha1").update(`doctor-tracker:demo:${kind}:${index}`).digest();
  return new mongoose.Types.ObjectId(digest.subarray(0, 12));
}

export function assertSeedSafety(options: SeedOptions = {}) {
  if (env.isProduction) {
    throw new Error("Demo seeding is disabled in production");
  }
  if (options.reset && !options.expectedDatabase) {
    throw new Error("Destructive demo reset requires expectedDatabase confirmation");
  }
  if (options.expectedDatabase && !/^[A-Za-z0-9_-]+$/.test(options.expectedDatabase)) {
    throw new Error("Expected demo database name contains invalid characters");
  }
  if (options.expectedDatabase && /prod/i.test(options.expectedDatabase)) {
    throw new Error("Refusing to seed a database whose name looks like production");
  }
}

export function assertTargetDatabase(expected?: string) {
  const actual = mongoose.connection.db?.databaseName;
  if (!actual) throw new Error("Demo seeding requires an active database connection");
  if (expected && actual !== expected) {
    throw new Error(`Refusing to seed unexpected database '${actual}' (expected '${expected}')`);
  }
  if (/prod/i.test(actual)) {
    throw new Error(`Refusing to seed database '${actual}' because its name looks like production`);
  }
}

export async function runDemoSeed(options: SeedOptions = {}) {
  assertSeedSafety(options);
  assertRuntimeEnv();
  await connectDb();
  assertTargetDatabase(options.expectedDatabase ?? process.env.DEMO_SEED_DATABASE);

  const admin = await ensureAdminSeed();
  if (!admin) throw new Error("Admin seeding did not complete");

  const doctorIds = doctorsSeed.map((_, i) => deterministicId("doctor", i));
  const patientIds = Array.from({ length: PATIENT_COUNT }, (_, i) => deterministicId("patient", i));

  if (options.reset) {
    if (!options.expectedDatabase) throw new Error("Destructive demo reset requires expectedDatabase confirmation");
    await Patient.deleteMany({ _id: { $in: patientIds } });
    await Doctor.deleteMany({ _id: { $in: doctorIds } });
  }

  await Doctor.bulkWrite(
    doctorsSeed.map((d, i) => ({
      updateOne: {
        filter: { _id: doctorIds[i] },
        update: {
          $set: {
            ...d,
            nameNormalized: normalizeText(d.name),
            specializationNormalized: normalizeText(d.specialization),
            hospitalNormalized: normalizeText(d.hospital),
          },
        },
        upsert: true,
      },
    }))
  );

  const patients = Array.from({ length: PATIENT_COUNT }, (_, i) => {
    const first = pick(firstNames, i * 3 + 1);
    const last = pick(lastNames, i * 5 + 2);
    const name = `${first} ${last}`;
    const doctor = doctorIds[i % doctorIds.length]!;
    const gender = pick(genders, i);
    const condition = pick(conditions, i * 2);
    const age = 18 + ((i * 7) % 65);
    const phone = `555-1${String(200 + i).padStart(3, "0")}`;
    const email = i % 5 === 0 ? undefined : `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const createdAt = daysAgo(i % 120);
    return {
      _id: patientIds[i],
      name,
      doctorId: doctor,
      age,
      gender,
      condition,
      phone,
      ...(email ? { email, emailNormalized: normalizeText(email) } : { email: undefined, emailNormalized: undefined }),
      nameNormalized: normalizeText(name),
      conditionNormalized: normalizeText(condition),
      phoneNormalized: normalizeText(phone),
      createdAt,
      updatedAt: createdAt,
    };
  });

  await Patient.bulkWrite(
    patients.map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: p },
        upsert: true,
      },
    }))
  );

  return { doctors: doctorIds.length, patients: patientIds.length };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const expectedDatabase = process.argv.find((a) => a.startsWith("--database="))?.slice("--database=".length);
  const result = await runDemoSeed({ reset, expectedDatabase });
  console.log(`Seeded ${result.doctors} demo doctors and ${result.patients} demo patients.`);
}

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("seed-demo.ts") || invokedPath.endsWith("seed-demo.js")) {
  main()
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectDb().catch(() => {});
    });
}
