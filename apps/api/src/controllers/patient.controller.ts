import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as patientService from "../services/patient.service.js";

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const result = await patientService.listPatients(req.query as any);
  res.json({ success: true, ...result });
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.createPatient(req.body);
  res.status(201).json({ success: true, data: patient });
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.getPatientById(req.params.id);
  res.json({ success: true, data: patient });
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  res.json({ success: true, data: patient });
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  await patientService.deletePatient(req.params.id);
  res.json({ success: true, message: "Patient deleted" });
});
