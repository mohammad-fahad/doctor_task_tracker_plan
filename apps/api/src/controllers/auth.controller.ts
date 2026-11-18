import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticateAdmin } from "../services/auth.service.js";
import type { AuthRequest } from "../middleware/auth.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE || env.isProduction,
  sameSite: env.COOKIE_SAME_SITE as "lax" | "strict" | "none",
  domain: env.COOKIE_DOMAIN,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const { token, user } = await authenticateAdmin(email, password);
  res.cookie(env.COOKIE_NAME, token, cookieOptions());
  res.json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(env.COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, message: "Logged out" });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});
