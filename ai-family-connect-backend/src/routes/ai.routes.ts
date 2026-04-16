/**
 * routes/ai.routes.ts
 * ─────────────────────────────────────────────────────────────
 * All AI-powered feature routes for "AI Powered Family Connect"
 *
 * Base path: /api/ai
 * All routes require authentication (protect middleware)
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { protect } from "../middleware/auth.middleware";
import {
  facialMoodMirror,
  voiceEmotionGuardian,
  doctorSlipScanner,
  injuryPhotoAnalyzer,
  recipeSuggester,
  medicineInteractionChecker,
  sleepStoryGenerator,
  emotionTrendForecaster,
  memoryCompanionChat,
  smartChatbotController,
  moodCompassController,
  getMoodHistory,
} from "../controllers/ai.controller";

const router = Router();

// ─── All AI routes require authentication ─────────────────────
router.use(protect);

// ─── Multer config for image uploads ──────────────────────────

/**
 * Create upload directory if it doesn't exist
 */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/**
 * Generic image storage factory
 * Creates separate folders for each feature
 */
const createImageStorage = (folder: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = path.join("src/uploads", folder);
      ensureDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

/**
 * File filter: accept only images
 */
const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WEBP images are allowed"));
  }
};

// Multer instances per feature (each in its own folder)
const uploadFaceImage = multer({
  storage: createImageStorage("mood_mirror"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("faceImage");

const uploadSlipImage = multer({
  storage: createImageStorage("doctor_slips"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("slipImage");

const uploadInjuryImage = multer({
  storage: createImageStorage("injury_photos"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("injuryImage");

// ═══════════════════════════════════════════════════════════════
// MOOD & EMOTION FEATURES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/mood-mirror
 * @desc    Analyze facial expression for emotion detection
 * @access  Private
 * @body    multipart/form-data — field: faceImage (image file)
 */
router.post("/mood-mirror", uploadFaceImage, facialMoodMirror);

/**
 * @route   POST /api/ai/voice-emotion
 * @desc    Analyze transcribed voice text for emotion & stress
 * @access  Private
 * @body    { transcribedText: string }
 */
router.post("/voice-emotion", voiceEmotionGuardian);

/**
 * @route   POST /api/ai/mood-compass
 * @desc    Get mood score + personalised activity suggestions
 * @access  Private
 * @body    { feelingDescription: string, timeOfDay?: "morning"|"afternoon"|"evening"|"night" }
 */
router.post("/mood-compass", moodCompassController);

/**
 * @route   GET /api/ai/emotion-trend
 * @desc    Analyse mood history and forecast emotional trend
 * @access  Private
 * @query   ?days=14
 */
router.get("/emotion-trend", emotionTrendForecaster);

/**
 * @route   GET /api/ai/mood-history
 * @desc    Get past mood entries for the logged-in user
 * @access  Private
 * @query   ?limit=20&source=facial_mirror
 */
router.get("/mood-history", getMoodHistory);

// ═══════════════════════════════════════════════════════════════
// MEDICAL FEATURES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/scan-doctor-slip
 * @desc    OCR a prescription image and extract medicine details
 * @access  Private
 * @body    multipart/form-data — field: slipImage (image file)
 * @note    Automatically creates Medicine records from scanned data
 */
router.post("/scan-doctor-slip", uploadSlipImage, doctorSlipScanner);

/**
 * @route   POST /api/ai/analyze-injury
 * @desc    Analyze an injury photo for severity and first-aid advice
 * @access  Private
 * @body    multipart/form-data — fields: injuryImage (file), bodyPart? (string), description? (string)
 */
router.post("/analyze-injury", uploadInjuryImage, injuryPhotoAnalyzer);

/**
 * @route   POST /api/ai/check-interactions
 * @desc    Check for dangerous interactions between medicines
 * @access  Private
 * @body    { medicines: string[], patientAge?: number, conditions?: string[] }
 */
router.post("/check-interactions", medicineInteractionChecker);

// ═══════════════════════════════════════════════════════════════
// WELLNESS FEATURES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/suggest-recipes
 * @desc    Get healthy recipe suggestions based on health conditions
 * @access  Private
 * @body    {
 *            healthConditions?: string[],
 *            dietaryRestrictions?: string[],
 *            availableIngredients?: string[],
 *            mealType?: "breakfast"|"lunch"|"dinner"|"snack",
 *            count?: number (1-5)
 *          }
 */
router.post("/suggest-recipes", recipeSuggester);

/**
 * @route   POST /api/ai/sleep-story
 * @desc    Generate a personalised calming bedtime story
 * @access  Private
 * @body    {
 *            mood?: string,
 *            preferences?: {
 *              theme?: string,
 *              length?: "short"|"medium"|"long",
 *              language?: string
 *            }
 *          }
 */
router.post("/sleep-story", sleepStoryGenerator);

// ═══════════════════════════════════════════════════════════════
// COMPANION & CHAT FEATURES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/memory-companion
 * @desc    Chat with AI Memory Companion (uses stored user memories)
 * @access  Private
 * @body    { message: string }
 */
router.post("/memory-companion", memoryCompanionChat);

/**
 * @route   POST /api/ai/chat
 * @desc    Smart AI chatbot for general help, health queries, support
 * @access  Private
 * @body    {
 *            message: string,
 *            history?: Array<{ role: "user"|"assistant", content: string }>
 *          }
 */
router.post("/chat", smartChatbotController);

export default router;
