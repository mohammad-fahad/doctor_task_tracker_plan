import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validated } from "../middleware/validate.js";
import type { DateRangeQuery } from "../validators/common.js";
import * as dashboardService from "../services/dashboard.service.js";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const { from, to } = validated<DateRangeQuery>(res, "query");
  const data = await dashboardService.getDashboardSummary(from, to);
  res.json({ success: true, data });
});
