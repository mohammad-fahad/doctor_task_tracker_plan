import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const genderSchema = z.enum(["male", "female", "other"]);

export const createPatientSchema = z.object({
  name: z.string().trim().min(2).max(100),
  doctorId: objectIdSchema,
  age: z.coerce.number().int().min(0).max(130),
  gender: genderSchema,
  condition: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
});

export const updatePatientSchema = createPatientSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  doctorId: z.string().optional(),
  condition: z.string().optional(),
});
