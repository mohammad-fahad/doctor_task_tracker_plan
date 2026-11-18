import { Router } from "express";
import { isDbHealthy } from "../config/db.js";
import authRoutes from "./auth.routes.js";
import doctorRoutes from "./doctor.routes.js";
import patientRoutes from "./patient.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

router.get("/ready", async (_req, res) => {
  const healthy = await isDbHealthy();
  if (!healthy) {
    return res.status(503).json({ success: false, data: { status: "unavailable", database: "unavailable" } });
  }
  return res.json({ success: true, data: { status: "ready", database: "connected" } });
});

router.use("/auth", authRoutes);
router.use("/doctors", doctorRoutes);
router.use("/patients", patientRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
