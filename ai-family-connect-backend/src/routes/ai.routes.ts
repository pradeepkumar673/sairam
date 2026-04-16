/**
 * routes/ai.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All AI-powered feature routes for "AI Powered Family Connect"
 * Base path: /api/ai  |  All routes require JWT auth (protect middleware)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware";

// Import using the ACTUAL exported function names from ai.controller.ts
import {
  analyzeMood,            // Facial Mood Mirror (Feature 8)
  analyzeVoiceEmotion,   // Voice Emotion Guardian (Feature 9)
  getMoodCompassSuggestions, // Mood Compass (Feature 10)
  forecastEmotionTrend,  // Emotion Trend Forecaster (Feature 11)
  getMoodHistory,        // Mood history fetch
  scanDoctorSlip,        // Doctor Slip Scanner (Feature 5)
  analyzeInjuryPhoto,    // Injury Photo Analyzer (Feature 2)
  checkMedicineInteraction, // Medicine Interaction Checker (Feature 7)
  suggestRecipe,         // Recipe Suggester (Feature 16)
  generateSleepStory,    // Sleep Story Generator (Feature 13)
  getMemoryStories,      // Memory Companion — list stories (Feature 12)
  addMemoryStory,        // Memory Companion — add story
  chatWithCompanion,     // Smart Chatbot / Saathi (Feature 15)
  getGameScores,         // Cognitive Game Corner (Feature 14)
  saveGameScore,
  logVideoCall,          // Video Call Logging (Feature 18)
  getVideoCallLogs,
} from "../controllers/ai.controller";

// Named upload instances from config/multer.ts
import {
  moodPhotoUpload,
  injuryPhotoUpload,
  doctorSlipUpload,
} from "../config/multer";

const router = Router();

// ─── All AI routes require authentication ─────────────────────────────────────
router.use(protect);

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD & EMOTION FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/mood-mirror
 * @desc    Facial Mood Mirror — analyze face photo for emotion detection
 * @body    multipart/form-data  field: faceImage (image file ≤ 5 MB)
 */
router.post("/mood-mirror", moodPhotoUpload.single("faceImage"), analyzeMood);

/**
 * @route   POST /api/ai/voice-emotion
 * @desc    Voice Emotion Guardian — analyse transcribed speech for stress/emotion
 * @body    { transcribedText: string }
 */
router.post("/voice-emotion", analyzeVoiceEmotion);

/**
 * @route   POST /api/ai/mood-compass
 * @desc    Mood Compass — personalised activity suggestions based on current mood
 * @body    { feelingDescription: string, timeOfDay?: "morning"|"afternoon"|"evening"|"night" }
 */
router.post("/mood-compass", getMoodCompassSuggestions);

/**
 * @route   GET /api/ai/emotion-trend
 * @desc    Emotion Trend Forecaster — analyse mood history and forecast trend
 * @query   ?days=14
 */
router.get("/emotion-trend", forecastEmotionTrend);

/**
 * @route   GET /api/ai/mood-history
 * @desc    Get past mood entries for the logged-in user
 * @query   ?limit=20&days=30
 */
router.get("/mood-history", getMoodHistory);

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/scan-doctor-slip
 * @desc    Doctor Slip Scanner — OCR prescription image, extract medicine details
 * @body    multipart/form-data  field: slipImage (image file ≤ 10 MB)
 */
router.post("/scan-doctor-slip", doctorSlipUpload.single("slipImage"), scanDoctorSlip);

/**
 * @route   POST /api/ai/analyze-injury
 * @desc    Injury Photo Analyzer — assess severity and provide first-aid guidance
 * @body    multipart/form-data  fields: injuryImage (file), bodyPart?, description?
 */
router.post("/analyze-injury", injuryPhotoUpload.single("injuryImage"), analyzeInjuryPhoto);

/**
 * @route   POST /api/ai/check-interactions
 * @desc    Medicine Interaction Checker — flag dangerous drug combinations
 * @body    { medicines: string[], patientAge?: number, conditions?: string[] }
 */
router.post("/check-interactions", checkMedicineInteraction);

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/suggest-recipes
 * @desc    Recipe Suggester — healthy meal ideas based on health conditions
 * @body    { healthConditions?, dietaryRestrictions?, availableIngredients?, mealType?, count? }
 */
router.post("/suggest-recipes", suggestRecipe);

/**
 * @route   POST /api/ai/sleep-story
 * @desc    Sleep Story Generator — personalised calming bedtime story
 * @body    { mood?, preferences?: { theme?, length?, language? } }
 */
router.post("/sleep-story", generateSleepStory);

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY COMPANION (Feature 12)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/ai/memory-stories
 * @desc    Retrieve all stored memory stories for the logged-in user
 */
router.get("/memory-stories", getMemoryStories);

/**
 * @route   POST /api/ai/memory-stories
 * @desc    Save a new memory / life story
 * @body    { title: string, content: string, tags?: string[], mediaUrl?: string }
 */
router.post("/memory-stories", addMemoryStory);

/**
 * @route   POST /api/ai/memory-companion
 * @desc    Smart Chatbot / AI Companion chat (uses stored memories)
 * @body    { message: string, history?: Array<{ role, content }> }
 */
router.post("/memory-companion", chatWithCompanion);

// ═══════════════════════════════════════════════════════════════════════════════
// CHATBOT (Feature 15)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/chat
 * @desc    Smart Chatbot — general help, health queries, emotional support
 * @body    { message: string, history?: Array<{ role, content }> }
 */
router.post("/chat", chatWithCompanion);

// ═══════════════════════════════════════════════════════════════════════════════
// COGNITIVE GAME CORNER (Feature 14)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/ai/game-scores
 * @query   ?gameName=memory_match
 */
router.get("/game-scores", getGameScores);

/**
 * @route   POST /api/ai/game-scores
 * @body    { gameName, score, level?, duration?, metadata? }
 */
router.post("/game-scores", saveGameScore);

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL LOGGING (Feature 18)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/video-call
 * @body    { familyId, participants, duration, callType?, status?, notes? }
 */
router.post("/video-call", logVideoCall);

/**
 * @route   GET /api/ai/video-calls
 * @query   ?limit=20
 */
router.get("/video-calls", getVideoCallLogs);

export default router;
