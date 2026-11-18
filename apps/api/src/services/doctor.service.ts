import mongoose, { type Types } from "mongoose";
import { Doctor, type IDoctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeText } from "../utils/normalize.js";
import { buildPagination, parsePagination } from "../utils/pagination.js";
import { buildDoctorFilter } from "../utils/queryBuilders.js";
import type { CreateDoctorInput, ListDoctorsQuery } from "../validators/doctor.js";

type DoctorWithId = IDoctor & { _id: Types.ObjectId };

export async function createDoctor(input: CreateDoctorInput) {
  const doc = await Doctor.create({
    ...input,
    nameNormalized: normalizeText(input.name),
    specializationNormalized: normalizeText(input.specialization),
    hospitalNormalized: normalizeText(input.hospital),
  });
  return { ...doc.toObject(), id: String(doc._id) };
}

export async function listDoctors(query: ListDoctorsQuery) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildDoctorFilter(query);

  const sort = query.sort === "oldest" ? ({ createdAt: 1, _id: 1 } as const) : ({ createdAt: -1, _id: -1 } as const);

  const [data, total] = await Promise.all([
    Doctor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

  return {
    data: (data as DoctorWithId[]).map((d) => ({ ...d, id: String(d._id) })),
    pagination: buildPagination(page, limit, total),
  };
}

export async function getDoctorById(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid doctor id");
  const doctor = (await Doctor.findById(id).lean()) as DoctorWithId | null;
  if (!doctor) throw new ApiError(404, "Doctor not found");
  const patientCount = await Patient.countDocuments({ doctorId: doctor._id });
  return { ...doctor, id: String(doctor._id), patientCount };
}

export async function getDoctorFilterOptions() {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct("specialization"),
    Doctor.distinct("hospital"),
  ]);
  const asStrings = (values: unknown[]) => values.filter((v): v is string => typeof v === "string");
  return {
    specializations: asStrings(specializations).sort((a, b) => a.localeCompare(b)),
    hospitals: asStrings(hospitals).sort((a, b) => a.localeCompare(b)),
  };
}
