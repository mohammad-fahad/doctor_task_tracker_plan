import { Router } from "express";
import { login, logout, me } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
