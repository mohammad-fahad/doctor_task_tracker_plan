import { z } from "zod";
import { paginationQuerySchema } from "./common.js";

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2).max(100),
  specialization: z.string().trim().min(2).max(100),
  hospital: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email(),
});

export const listDoctorsQuerySchema = paginationQuerySchema.extend({
  specialization: z.string().optional(),
  hospital: z.string().optional(),
});
