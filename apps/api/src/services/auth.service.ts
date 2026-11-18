import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

export async function authenticateAdmin(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(401, "Invalid email or password");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, "Invalid email or password");
  const token = jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
  return { token, user: { id: String(user._id), email: user.email, role: user.role } };
}

export async function ensureAdminSeed(email?: string, password?: string) {
  const adminEmail = (email || env.ADMIN_EMAIL || "").toLowerCase();
  const adminPassword = password || env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be provided for admin seeding");
  }
  const existing = await User.findOne({ email: adminEmail });
  if (existing) return { created: false, email: adminEmail };
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await User.create({ email: adminEmail, passwordHash, role: "admin" });
  return { created: true, email: adminEmail };
}
