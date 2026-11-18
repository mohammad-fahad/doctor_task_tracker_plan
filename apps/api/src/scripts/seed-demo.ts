import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { disconnectDb } from "../config/db.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ensureAdminSeed } from "../services/auth.service.js";
import { normalizeText } from "../utils/normalize.js";
import {
  assertConnectedDatabase,
  assertSeedGuards,
  defaultSeedConfig,
  formatSeedSummary,
  isDirectInvocation,
  parseSeedCliArgs,
  seedErrorMessage,
  withSeedDb,
  type SeedConfig,
  type SeedSummary,
} from "./seed-guards.js";

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

export type DemoSeedOptions = Partial<SeedConfig> & { includeAdmin?: boolean };

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

export function assertSeedSafety(options: Partial<SeedConfig> = {}) {
  assertSeedGuards({ ...defaultSeedConfig(), ...options });
}

export function assertTargetDatabase(expected?: string) {
  assertConnectedDatabase(expected);
}

export async function seedDemoData(config: SeedConfig) {
  const doctorIds = doctorsSeed.map((_, i) => deterministicId("doctor", i));
  const patientIds = Array.from({ length: PATIENT_COUNT }, (_, i) => deterministicId("patient", i));

  if (config.removeDemo) {
    await Patient.deleteMany({ _id: { $in: patientIds } });
    await Doctor.deleteMany({ _id: { $in: doctorIds } });
    return { doctors: doctorIds.length, patients: patientIds.length, removed: true };
  }

  if (config.reset) {
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

  return { doctors: doctorIds.length, patients: patientIds.length, removed: false };
}

export async function runDemoSeed(options: DemoSeedOptions = {}) {
  const config: SeedConfig = { ...defaultSeedConfig(), ...options, scope: "demo" };
  return withSeedDb(config, async () => {
    if (options.includeAdmin !== false) {
      const admin = await ensureAdminSeed();
      if (!admin) throw new Error("Admin seeding did not complete");
    }
    return seedDemoData(config);
  });
}

async function main(): Promise<SeedSummary> {
  const config = parseSeedCliArgs(process.argv.slice(2));
  const demo = await runDemoSeed(config);
  return { demo: { ...demo, reset: config.reset } };
}

if (isDirectInvocation(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: npm run seed:demo -- [options] (see npm run seed:uat -- --help)");
  } else {
    main()
      .then((summary) => console.log(formatSeedSummary(summary)))
      .catch((err: unknown) => {
        console.error(seedErrorMessage(err));
        process.exitCode = 1;
      })
      .finally(async () => {
        await disconnectDb().catch(() => {});
      });
  }
}
