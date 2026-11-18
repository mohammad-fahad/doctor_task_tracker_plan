import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeText } from "../utils/normalize.js";
import { buildPagination, parsePagination } from "../utils/pagination.js";
import { buildDoctorFilter } from "../utils/queryBuilders.js";

export type DoctorListQuery = {
  page?: string; limit?: string; search?: string; specialization?: string; hospital?: string; sort?: "newest"|"oldest"; from?: string; to?: string;
};

export async function createDoctor(input: { name: string; specialization: string; hospital: string; phone: string; email: string }) {
  const doc = await Doctor.create({
    ...input,
    nameNormalized: normalizeText(input.name),
    specializationNormalized: normalizeText(input.specialization),
    hospitalNormalized: normalizeText(input.hospital),
  });
  const obj = doc.toObject() as any;
  obj.id = String(obj._id);
  return obj;
}

export async function listDoctors(query: DoctorListQuery) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildDoctorFilter(query);

  const sort = query.sort === "oldest" ? { createdAt: 1 as const, _id: 1 as const } : { createdAt: -1 as const, _id: -1 as const };

  const [data, total] = await Promise.all([
    Doctor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

  return {
    data: data.map((d: any) => ({ ...d, id: String(d._id) })),
    pagination: buildPagination(page, limit, total),
  };
}

export async function getDoctorById(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid doctor id");
  const doctor: any = await Doctor.findById(id).lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");
  const patientCount = await Patient.countDocuments({ doctorId: doctor._id });
  return { ...doctor, id: String(doctor._id), patientCount };
}

export async function getDoctorFilterOptions() {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct("specialization"),
    Doctor.distinct("hospital"),
  ]);
  return {
    specializations: specializations.sort((a, b) => a.localeCompare(b)),
    hospitals: hospitals.sort((a, b) => a.localeCompare(b)),
  };
}
