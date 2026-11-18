import mongoose, { type Types, type UpdateQuery } from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Patient, type IPatient } from "../models/Patient.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeText } from "../utils/normalize.js";
import { buildPagination, parsePagination } from "../utils/pagination.js";
import { buildPatientFilter } from "../utils/queryBuilders.js";
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from "../validators/patient.js";

type NewPatient = Omit<IPatient, "createdAt" | "updatedAt">;

type PopulatedDoctor = {
  _id: Types.ObjectId;
  name: string;
  specialization: string;
  hospital: string;
};

type PatientWithDoctor = Omit<IPatient, "doctorId"> & {
  _id: Types.ObjectId;
  doctorId: PopulatedDoctor | Types.ObjectId;
};

type MappedPatient = Omit<PatientWithDoctor, "_id" | "doctorId"> & {
  id: string;
  doctorId: string;
  doctor: { id: string; name: string; specialization: string; hospital: string } | null;
};

export type { ListPatientsQuery as PatientListQuery } from "../validators/patient.js";

function toNormalized(input: Partial<CreatePatientInput> | UpdatePatientInput) {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.nameNormalized = normalizeText(input.name);
  if (input.condition !== undefined) out.conditionNormalized = normalizeText(input.condition);
  if (input.phone !== undefined) out.phoneNormalized = normalizeText(input.phone);
  if (input.email) out.emailNormalized = normalizeText(input.email);
  return out;
}

function isPopulatedDoctor(value: PopulatedDoctor | Types.ObjectId): value is PopulatedDoctor {
  return value != null && typeof value === "object" && "name" in value;
}

function mapPatient(p: PatientWithDoctor): MappedPatient {
  const doctor = isPopulatedDoctor(p.doctorId)
    ? {
        id: String(p.doctorId._id),
        name: p.doctorId.name,
        specialization: p.doctorId.specialization,
        hospital: p.doctorId.hospital,
      }
    : null;
  const doctorId = isPopulatedDoctor(p.doctorId) ? String(p.doctorId._id) : String(p.doctorId);
  const { _id, doctorId: rawDoctorId, ...rest } = p;
  void _id;
  void rawDoctorId;
  return { ...rest, id: String(_id), doctorId, doctor };
}

export async function assertDoctorExists(doctorId: string) {
  if (!mongoose.isValidObjectId(doctorId)) throw new ApiError(400, "Invalid doctor id");
  const exists = await Doctor.exists({ _id: doctorId });
  if (!exists) throw new ApiError(400, "Referenced doctor does not exist");
}

export async function createPatient(input: CreatePatientInput): Promise<MappedPatient> {
  await assertDoctorExists(input.doctorId);
  const payload: NewPatient = {
    name: input.name,
    doctorId: new mongoose.Types.ObjectId(input.doctorId),
    age: input.age,
    gender: input.gender,
    condition: input.condition,
    phone: input.phone,
    nameNormalized: normalizeText(input.name),
    conditionNormalized: normalizeText(input.condition),
    phoneNormalized: normalizeText(input.phone),
    ...(input.email ? { email: input.email, emailNormalized: normalizeText(input.email) } : {}),
  };
  const doc = await Patient.create(payload);
  const populated = (await Patient.findById(doc._id)
    .populate("doctorId", "name specialization hospital")
    .lean()) as PatientWithDoctor | null;
  if (!populated) throw new ApiError(500, "Failed to load created patient");
  return mapPatient(populated);
}

export async function listPatients(query: ListPatientsQuery, fixedDoctorId?: string) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildPatientFilter(query) as Record<string, unknown>;
  const doctorId = fixedDoctorId || query.doctorId;
  if (doctorId) {
    if (!mongoose.isValidObjectId(doctorId)) throw new ApiError(400, "Invalid doctor id");
    filter.doctorId = new mongoose.Types.ObjectId(doctorId);
  }

  const sort = query.sort === "oldest" ? ({ createdAt: 1, _id: 1 } as const) : ({ createdAt: -1, _id: -1 } as const);

  const [data, total] = await Promise.all([
    Patient.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("doctorId", "name specialization hospital")
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return {
    data: (data as PatientWithDoctor[]).map(mapPatient),
    pagination: buildPagination(page, limit, total),
  };
}

export async function getPatientById(id: string): Promise<MappedPatient> {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid patient id");
  const p = (await Patient.findById(id)
    .populate("doctorId", "name specialization hospital")
    .lean()) as PatientWithDoctor | null;
  if (!p) throw new ApiError(404, "Patient not found");
  return mapPatient(p);
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<MappedPatient> {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid patient id");
  if (input.doctorId) await assertDoctorExists(input.doctorId);

  const set: Record<string, unknown> = { ...input, ...toNormalized(input) };
  if (input.doctorId) set.doctorId = new mongoose.Types.ObjectId(input.doctorId);
  if (!("email" in input)) {
    delete set.email;
  }
  const unset: Record<string, 1> = {};
  if ("email" in input && !input.email) {
    delete set.email;
    delete set.emailNormalized;
    unset.email = 1;
    unset.emailNormalized = 1;
  }

  const update: UpdateQuery<IPatient> = { ...set };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  const updated = (await Patient.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate("doctorId", "name specialization hospital")
    .lean()) as PatientWithDoctor | null;
  if (!updated) throw new ApiError(404, "Patient not found");
  return mapPatient(updated);
}

export async function deletePatient(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid patient id");
  const deleted = await Patient.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, "Patient not found");
  return { id };
}
