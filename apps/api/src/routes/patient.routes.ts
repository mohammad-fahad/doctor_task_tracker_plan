import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { listPatients, createPatient, getPatient, updatePatient, deletePatient } from "../controllers/patient.controller.js";
import { createPatientSchema, updatePatientSchema, listPatientsQuerySchema } from "../validators/patient.js";
import { objectIdSchema } from "../validators/common.js";

const router = Router();
router.use(requireAuth);

const idParams = z.object({ id: objectIdSchema });

router.get("/", validate(listPatientsQuerySchema, "query"), listPatients);
router.post("/", validate(createPatientSchema), createPatient);
router.get("/:id", validate(idParams, "params"), getPatient);
router.patch("/:id", validate(idParams, "params"), validate(updatePatientSchema), updatePatient);
router.delete("/:id", validate(idParams, "params"), deletePatient);

export default router;
