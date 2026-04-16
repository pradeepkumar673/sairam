import { Router } from "express";
import {
  triggerSOS,
  resolveSOS,
  getSOSHistory,
  reportFallEvent,
  reviewFallEvent,
  getFallEvents,
  uploadInjuryPhoto,
  getInjuryPhotos,
  reportPostureAlert,
  getPostureAlerts,
} from "../controllers/safety.controller";
import { protect } from "../middleware/auth.middleware";
import { injuryPhotoUpload } from "../config/multer";

const router = Router();
router.use(protect);

router.post("/sos", triggerSOS);
router.put("/sos/:alertId/resolve", resolveSOS);
router.get("/sos/history", getSOSHistory);
router.post("/fall-event", reportFallEvent);
router.put("/fall-event/:eventId/review", reviewFallEvent);
router.get("/fall-events", getFallEvents);
router.post("/injury-photo", injuryPhotoUpload.single("injuryImage"), uploadInjuryPhoto);
router.get("/injury-photos", getInjuryPhotos);
router.post("/posture-alert", reportPostureAlert);
router.get("/posture-alerts", getPostureAlerts);

export default router;