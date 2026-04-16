/**
 * ai.routes.ts — Fixed, Extended & Aligned
 * Final integrated routes matching frontend components and dual-AI controllers.
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { 
  moodPhotoUpload, 
  doctorSlipUpload, 
  injuryPhotoUpload 
} from "../config/multer";
import {
  analyzeMood,
  analyzeVoiceEmotion,
  scanPrescription,
  analyzeInjury,
  suggestRecipe,
  getSleepStory,
  getMoodHistory,
  saveMoodEntry,
  getMoodCompass,
  getEmotionTrend,
  getMemoryStories,
  addMemoryStory,
  getMemoryFollowUp,
  checkMedicineInteraction,
  companionChat,
  getGameScores,
  saveGameScore,
  getWeatherNudge,
  getFamilyDashboard,
  logVideoCall,
  getVideoCallLogs,
} from "../controllers/ai.controller";

const router = Router();

// All AI routes require authentication
router.use(protect);

// ── Mood Mirror ───────────────────────────────────────────────────────────────
// Field name: faceImage (matches MoodAnalyzer.tsx)
router.post("/mood-mirror", moodPhotoUpload.single("faceImage"), analyzeMood);
router.get("/mood-compass", getMoodCompass);
router.get("/emotion-trend", getEmotionTrend);
router.get("/mood-history", getMoodHistory);
router.post("/mood-entry", saveMoodEntry);

// ── Voice Emotion ─────────────────────────────────────────────────────────────
// Body: { text: string } OR { transcribedText: string }
router.post("/voice-emotion", analyzeVoiceEmotion);

// ── Doctor Slip Scanner ───────────────────────────────────────────────────────
// Aliased for convenience. Field name: slipImage (matches DoctorSlipScanner.tsx)
router.post("/scan-slip", doctorSlipUpload.single("slipImage"), scanPrescription);
router.post("/scan-prescription", doctorSlipUpload.single("prescriptionImage"), scanPrescription);

// ── Wound / Injury Photo ──────────────────────────────────────────────────────
// Field name: injuryImage (matches WoundIdentifier.tsx)
router.post("/injury-photo", injuryPhotoUpload.single("injuryImage"), analyzeInjury);
router.post("/analyze-injury", injuryPhotoUpload.single("injuryImage"), analyzeInjury);

// ── Cognitive Assistants ──────────────────────────────────────────────────────
router.post("/recipe-suggest", suggestRecipe);
router.post("/sleep-story", getSleepStory);
router.post("/medicine-interaction", checkMedicineInteraction);
router.post("/chat", companionChat);

// ── Memory Hub ───────────────────────────────────────────────────────────────
router.get("/memory-stories", getMemoryStories);
router.post("/memory-stories", addMemoryStory);
router.get("/memory-stories/:storyId/follow-up", getMemoryFollowUp);

// ── Games & Engagement ────────────────────────────────────────────────────────
router.get("/game-scores", getGameScores);
router.post("/game-scores", saveGameScore);

// ── Utilities & Social ────────────────────────────────────────────────────────
router.get("/weather-nudge", getWeatherNudge);
router.get("/dashboard", getFamilyDashboard);
router.post("/video-call", logVideoCall);
router.get("/video-call-logs", getVideoCallLogs);

export default router;