import { Router } from "express";
import {
  addMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  logDose,
  getMedicineLogs,
  getComplianceSummary,
  scanDoctorSlip,
  getRefillAlerts,
  restockMedicine,
} from "../controllers/medicine.controller";
import { protect } from "../middleware/auth.middleware";
import { doctorSlipUpload } from "../config/multer";

const router = Router();

// All medicine routes are protected
router.use(protect);

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────
router.post("/", addMedicine);
router.get("/", getMedicines);
router.get("/compliance/summary", getComplianceSummary);
router.get("/refill-alerts", getRefillAlerts);
router.get("/:id", getMedicineById);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);

// ─────────────────────────────────────────────
// Compliance Tracking
// ─────────────────────────────────────────────
router.post("/:id/log", logDose);
router.get("/:id/logs", getMedicineLogs);

// ─────────────────────────────────────────────
// Doctor Slip Scanner
// ─────────────────────────────────────────────
router.post("/scan-slip", doctorSlipUpload.single("slipImage"), scanDoctorSlip);

// ─────────────────────────────────────────────
// Refill Guardian
// ─────────────────────────────────────────────
router.put("/:id/restock", restockMedicine);

export default router;
