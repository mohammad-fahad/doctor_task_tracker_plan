import { connectDb, disconnectDb } from "../config/db.js";
import { assertRuntimeEnv } from "../config/env.js";
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
];

const firstNames = ["Emma","Liam","Olivia","Noah","Ava","Elijah","Sophia","James","Isabella","William","Mia","Benjamin","Charlotte","Lucas","Amelia","Henry","Harper","Alexander","Evelyn","Michael","Abigail","Daniel","Emily","Matthew"];
const lastNames = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin"];
const genders = ["male", "female", "other"] as const;
const conditions = [
  "Hypertension","Type 2 Diabetes","Asthma","Migraine","Arthritis","Eczema","Anxiety","Back Pain","Allergic Rhinitis","Hypothyroidism",
  "GERD","Coronary Artery Disease","Depression","COPD","Irritable Bowel Syndrome"
];

function pick<T>(arr: readonly T[], i: number) { return arr[i % arr.length]; }

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0);
  return d;
}

async function main() {
  assertRuntimeEnv();
  await connectDb();
  await ensureAdminSeed().catch(() => {});

  // Idempotent demo state for this assignment dataset.
  await Patient.deleteMany({});
  await Doctor.deleteMany({});

  const doctorDocs = await Doctor.insertMany(
    doctorsSeed.map((d) => ({
      ...d,
      nameNormalized: normalizeText(d.name),
      specializationNormalized: normalizeText(d.specialization),
      hospitalNormalized: normalizeText(d.hospital),
    }))
  );

  const patients: any[] = [];
  const total = 84;
  for (let i = 0; i < total; i++) {
    const first = pick(firstNames, i * 3 + 1);
    const last = pick(lastNames, i * 5 + 2);
    const name = `${first} ${last}`;
    const doctor = doctorDocs[i % doctorDocs.length];
    const gender = pick(genders, i);
    const condition = pick(conditions, i * 2);
    const age = 18 + ((i * 7) % 65);
    const phone = `555-1${String(200 + i).padStart(3, "0")}`;
    const email = i % 5 === 0 ? undefined : `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const createdAt = daysAgo(i % 120);
    patients.push({
      name,
      doctorId: doctor._id,
      age,
      gender,
      condition,
      phone,
      email,
      nameNormalized: normalizeText(name),
      conditionNormalized: normalizeText(condition),
      phoneNormalized: normalizeText(phone),
      emailNormalized: email ? normalizeText(email) : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await Patient.insertMany(patients);

  console.log(`Seeded ${doctorDocs.length} doctors and ${patients.length} patients.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb().catch(() => {});
  });
