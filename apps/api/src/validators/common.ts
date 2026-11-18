import { z } from "zod";
import mongoose from "mongoose";

export const objectIdSchema = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: "Invalid id",
});

export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const dateRangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
