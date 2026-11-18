import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dateRangeQuerySchema } from "../validators/common.js";
import { getSummary } from "../controllers/dashboard.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/summary", validate(dateRangeQuerySchema, "query"), getSummary);

export default router;
