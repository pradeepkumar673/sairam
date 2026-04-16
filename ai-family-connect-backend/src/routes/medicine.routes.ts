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
  getNearestPharmacies,
} from "../controllers/medicine.controller";
import { protect } from "../middleware/auth.middleware";
import { doctorSlipUpload } from "../config/multer";

const router = Router();
router.use(protect);

router.post("/", addMedicine);
router.post("/pharmacies", getNearestPharmacies);
router.get("/", getMedicines);
router.get("/compliance/summary", getComplianceSummary);
router.get("/refill-alerts", getRefillAlerts);
router.get("/:id", getMedicineById);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);
router.post("/:id/log", logDose);
router.get("/:id/logs", getMedicineLogs);
router.post("/scan-slip", doctorSlipUpload.single("slipImage"), scanDoctorSlip);
router.put("/:id/restock", restockMedicine);

export default router;