import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validated } from "../middleware/validate.js";
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from "../validators/patient.js";
import * as patientService from "../services/patient.service.js";

export const listPatients = asyncHandler(async (_req: Request, res: Response) => {
  const result = await patientService.listPatients(validated<ListPatientsQuery>(res, "query"));
  res.json({ success: true, ...result });
});

export const createPatient = asyncHandler(async (_req: Request, res: Response) => {
  const patient = await patientService.createPatient(validated<CreatePatientInput>(res, "body"));
  res.status(201).json({ success: true, data: patient });
});

export const getPatient = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = validated<{ id: string }>(res, "params");
  const patient = await patientService.getPatientById(id);
  res.json({ success: true, data: patient });
});

export const updatePatient = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = validated<{ id: string }>(res, "params");
  const patient = await patientService.updatePatient(id, validated<UpdatePatientInput>(res, "body"));
  res.json({ success: true, data: patient });
});

export const deletePatient = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = validated<{ id: string }>(res, "params");
  await patientService.deletePatient(id);
  res.json({ success: true, message: "Patient deleted" });
});
