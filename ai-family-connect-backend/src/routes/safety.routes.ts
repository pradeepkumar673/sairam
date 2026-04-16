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
import { protectRoute } from "../middleware/auth.middleware";
import { uploadInjuryPhoto as uploadInjuryPhotoMiddleware } from "../middleware/upload.middleware";

const router = Router();

// All safety routes require authentication
router.use(protectRoute);

// ─────────────────────────────────────────────
// ONE-TAP SOS
// ─────────────────────────────────────────────

/**
 * @route   POST /api/safety/sos
 * @desc    Trigger an emergency SOS — notifies all linked family members instantly
 * @body    { latitude?, longitude?, message?, address? }
 */
router.post("/sos", triggerSOS);

/**
 * @route   PUT /api/safety/sos/:alertId/resolve
 * @desc    Mark SOS as resolved (user is safe)
 */
router.put("/sos/:alertId/resolve", resolveSOS);

/**
 * @route   GET /api/safety/sos/history
 * @desc    View past SOS alerts
 * @query   ?userId=<id>&limit=10
 */
router.get("/sos/history", getSOSHistory);

// ─────────────────────────────────────────────
// SMART FALL SENTINEL
// ─────────────────────────────────────────────

/**
 * @route   POST /api/safety/fall-event
 * @desc    Log a fall (from sensor or manual) and notify family
 * @body    { latitude?, longitude?, severity?, deviceData?, description? }
 */
router.post("/fall-event", reportFallEvent);

/**
 * @route   PUT /api/safety/fall-event/:eventId/review
 * @desc    Review a fall event (false alarm / attended)
 * @body    { status: "false_alarm" | "attended", reviewNotes? }
 */
router.put("/fall-event/:eventId/review", reviewFallEvent);

/**
 * @route   GET /api/safety/fall-events
 * @desc    Get fall event history
 * @query   ?userId=<id>&limit=20
 */
router.get("/fall-events", getFallEvents);

// ─────────────────────────────────────────────
// INJURY PHOTO ANALYZER
// ─────────────────────────────────────────────

/**
 * @route   POST /api/safety/injury-photo
 * @desc    Upload an injury photo for Gemini AI analysis
 * @form    injuryImage (file), bodyPart?, description?
 */
router.post("/injury-photo", uploadInjuryPhotoMiddleware, uploadInjuryPhoto);

/**
 * @route   GET /api/safety/injury-photos
 * @desc    Get all injury photo records
 */
router.get("/injury-photos", getInjuryPhotos);

// ─────────────────────────────────────────────
// POSTURE SENTINEL
// ─────────────────────────────────────────────

/**
 * @route   POST /api/safety/posture-alert
 * @desc    Log a posture alert from device sensors
 * @body    { type: "no_movement"|"bad_posture"|"inactivity"|"unusual_posture", duration?, deviceData? }
 */
router.post("/posture-alert", reportPostureAlert);

/**
 * @route   GET /api/safety/posture-alerts
 * @desc    Get posture alert history
 * @query   ?userId=<id>&limit=20
 */
router.get("/posture-alerts", getPostureAlerts);

export default router;
