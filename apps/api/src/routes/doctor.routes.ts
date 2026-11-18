import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { createDoctor, listDoctors, getDoctor, getDoctorPatients, addDoctorPatient, getDoctorFilterOptions } from "../controllers/doctor.controller.js";
import { createDoctorSchema, listDoctorsQuerySchema } from "../validators/doctor.js";
import { createPatientSchema, listPatientsQuerySchema } from "../validators/patient.js";
import { objectIdSchema } from "../validators/common.js";

const router = Router();
router.use(requireAuth);

const idParams = z.object({ id: objectIdSchema });

router.get("/", validate(listDoctorsQuerySchema, "query"), listDoctors);
router.post("/", validate(createDoctorSchema), createDoctor);
router.get("/filters/options", getDoctorFilterOptions);
router.get("/:id", validate(idParams, "params"), getDoctor);
router.get("/:id/patients", validate(idParams, "params"), validate(listPatientsQuerySchema, "query"), getDoctorPatients);
router.post("/:id/patients", validate(idParams, "params"), validate(createPatientSchema.omit({ doctorId: true })), addDoctorPatient);

export default router;
