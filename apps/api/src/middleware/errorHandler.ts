import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, "Resource not found"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (env.isProduction) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ success: false, message });
}
