import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeText } from "../utils/normalize.js";
import { buildPagination, parsePagination } from "../utils/pagination.js";
import { buildPatientFilter } from "../utils/queryBuilders.js";

type PatientInput = {
  name: string;
  doctorId: string;
  age: number;
  gender: "male" | "female" | "other";
  condition: string;
  phone: string;
  email?: string;
};

export type PatientListQuery = {
  page?: string; limit?: string; search?: string; doctorId?: string; condition?: string; sort?: "newest"|"oldest"; from?: string; to?: string;
};

function toNormalized(input: Partial<PatientInput>) {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.nameNormalized = normalizeText(input.name);
  if (input.condition !== undefined) out.conditionNormalized = normalizeText(input.condition);
  if (input.phone !== undefined) out.phoneNormalized = normalizeText(input.phone);
  if ("email" in input) out.emailNormalized = input.email ? normalizeText(input.email) : undefined;
  return out;
}

function mapPatient(p: any) {
  const doctor = p.doctorId && typeof p.doctorId === "object" && p.doctorId._id
    ? { id: String(p.doctorId._id), name: p.doctorId.name, specialization: p.doctorId.specialization, hospital: p.doctorId.hospital }
    : null;
  const doctorId = p.doctorId && typeof p.doctorId === "object" && p.doctorId._id ? String(p.doctorId._id) : String(p.doctorId);
  return { ...p, id: String(p._id), doctorId, doctor };
}

export async function assertDoctorExists(doctorId: string) {
  if (!mongoose.isValidObjectId(doctorId)) throw new ApiError(400, "Invalid doctor id");
  const exists = await Doctor.exists({ _id: doctorId });
  if (!exists) throw new ApiError(400, "Referenced doctor does not exist");
}

export async function createPatient(input: PatientInput) {
  await assertDoctorExists(input.doctorId);
  const payload: Record<string, unknown> = {
    name: input.name,
    doctorId: new mongoose.Types.ObjectId(input.doctorId),
    age: input.age,
    gender: input.gender,
    condition: input.condition,
    phone: input.phone,
    nameNormalized: normalizeText(input.name),
    conditionNormalized: normalizeText(input.condition),
    phoneNormalized: normalizeText(input.phone),
  };
  if (input.email) {
    payload.email = input.email;
    payload.emailNormalized = normalizeText(input.email);
  }
  const doc = await Patient.create(payload as any);
  const populated = await Patient.findById((doc as any)._id).populate("doctorId", "name specialization hospital").lean();
  return mapPatient(populated);
}

export async function listPatients(query: PatientListQuery, fixedDoctorId?: string) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildPatientFilter(query) as Record<string, unknown>;
  const doctorId = fixedDoctorId || query.doctorId;
  if (doctorId) {
    if (!mongoose.isValidObjectId(doctorId)) throw new ApiError(400, "Invalid doctor id");
    filter.doctorId = new mongoose.Types.ObjectId(doctorId);
  }

  const sort = query.sort === "oldest" ? { createdAt: 1 as const, _id: 1 as const } : { createdAt: -1 as const, _id: -1 as const };

  const [data, total] = await Promise.all([
    Patient.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("doctorId", "name specialization hospital")
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return { data: (data as any[]).map(mapPatient), pagination: buildPagination(page, limit, total) };
}

export async function getPatientById(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid patient id");
  const p: any = await Patient.findById(id).populate("doctorId", "name specialization hospital").lean();
  if (!p) throw new ApiError(404, "Patient not found");
  return mapPatient(p);
}

export async function updatePatient(id: string, input: Partial<PatientInput>) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid patient id");
  if (input.doctorId) await assertDoctorExists(input.doctorId);
  const update: Record<string, unknown> = { ...input, ...toNormalized(input) };
  if (input.doctorId) update.doctorId = new mongoose.Types.ObjectId(input.doctorId);
  if (!("email" in input)) delete update.email; // leave unchanged if not provided
  if ("email" in input && !input.email) update.email = undefined;

  const updated = await Patient.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate("doctorId", "name specialization hospital")
    .lean();
  if (!updated) throw new ApiError(404, "Patient not found");
  return mapPatient(updated);
}

export async function deletePatient(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid patient id");
  const deleted = await Patient.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, "Patient not found");
  return { id };
}
