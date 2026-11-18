import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) return next(new ApiError(401, "Authentication required"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await User.findById(payload.sub).select("email role").lean();
    if (!user) return next(new ApiError(401, "Authentication required"));
    req.user = { id: String(user._id), email: user.email, role: user.role };
    next();
  } catch {
    next(new ApiError(401, "Authentication required"));
  }
}

export function verifyOrigin(req: Request, _res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // allow non-browser clients
  if (!env.corsOrigins.includes(origin)) {
    return next(new ApiError(403, "Invalid origin"));
  }
  next();
}
