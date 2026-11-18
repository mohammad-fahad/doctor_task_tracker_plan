import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as dashboardService from "../services/dashboard.service.js";

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const data = await dashboardService.getDashboardSummary(from, to);
  res.json({ success: true, data });
});
