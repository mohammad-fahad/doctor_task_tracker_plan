import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as doctorService from "../services/doctor.service.js";
import * as patientService from "../services/patient.service.js";

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.createDoctor(req.body);
  res.status(201).json({ success: true, data: doctor });
});

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const result = await doctorService.listDoctors(req.query as any);
  res.json({ success: true, ...result });
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorById(req.params.id);
  res.json({ success: true, data: doctor });
});

export const getDoctorPatients = asyncHandler(async (req: Request, res: Response) => {
  const result = await patientService.listPatients(req.query as any, req.params.id);
  res.json({ success: true, ...result });
});

export const addDoctorPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.createPatient({ ...req.body, doctorId: req.params.id });
  res.status(201).json({ success: true, data: patient });
});

export const getDoctorFilterOptions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await doctorService.getDoctorFilterOptions();
  res.json({ success: true, data });
});
