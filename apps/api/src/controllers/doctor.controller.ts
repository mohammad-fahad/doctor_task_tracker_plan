import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validated } from "../middleware/validate.js";
import type { CreateDoctorInput, ListDoctorsQuery } from "../validators/doctor.js";
import type { CreatePatientInput, ListPatientsQuery } from "../validators/patient.js";
import * as doctorService from "../services/doctor.service.js";
import * as patientService from "../services/patient.service.js";

export const createDoctor = asyncHandler(async (_req: Request, res: Response) => {
  const doctor = await doctorService.createDoctor(validated<CreateDoctorInput>(res, "body"));
  res.status(201).json({ success: true, data: doctor });
});

export const listDoctors = asyncHandler(async (_req: Request, res: Response) => {
  const result = await doctorService.listDoctors(validated<ListDoctorsQuery>(res, "query"));
  res.json({ success: true, ...result });
});

export const getDoctor = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = validated<{ id: string }>(res, "params");
  const doctor = await doctorService.getDoctorById(id);
  res.json({ success: true, data: doctor });
});

export const getDoctorPatients = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = validated<{ id: string }>(res, "params");
  const result = await patientService.listPatients(validated<ListPatientsQuery>(res, "query"), id);
  res.json({ success: true, ...result });
});

export const addDoctorPatient = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = validated<{ id: string }>(res, "params");
  const body = validated<Omit<CreatePatientInput, "doctorId">>(res, "body");
  const patient = await patientService.createPatient({ ...body, doctorId: id });
  res.status(201).json({ success: true, data: patient });
});

export const getDoctorFilterOptions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await doctorService.getDoctorFilterOptions();
  res.json({ success: true, data });
});
