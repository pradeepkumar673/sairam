/**
 * controllers/ai.controller.ts
 * ─────────────────────────────────────────────────────────────
 * Handles all AI-powered feature endpoints.
 * Each controller function:
 *  1. Validates input
 *  2. Calls the appropriate Gemini helper
 *  3. Saves results to DB where needed
 *  4. Emits Socket.io alerts for urgent situations
 *  5. Returns a clean API response
 * ─────────────────────────────────────────────────────────────
 */

import { Request, Response } from "express";
import { Types } from "mongoose";

// Gemini helpers
import {
  analyzeFacialMood,
  analyzeVoiceEmotion,
  scanDoctorSlip,
  analyzeInjuryPhoto,
  suggestRecipes,
  checkMedicineInteractions,
  generateSleepStory,
  forecastEmotionTrend,
  aiMemoryCompanion,
  smartChatbot,
  getMoodCompassSuggestions,
  imageFileToBase64,
} from "../helpers/gemini.helper";

// Models
import MoodEntry from "../models/MoodEntry";
import Medicine from "../models/Medicine";
import UserStory from "../models/UserStory";
import ChatMessage from "../models/ChatMessage";
import User from "../models/User";

// Utils
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";

// ─── Extend Request to carry authenticated user ───────────────
// (defined in src/types/express.d.ts)
interface AuthRequest extends Request {
  user?: {
    _id: Types.ObjectId;
    name: string;
    role: string;
    email: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. FACIAL MOOD MIRROR
//    POST /api/ai/mood-mirror
//    Body: multipart/form-data with field "faceImage" (file)
// ═══════════════════════════════════════════════════════════════

export const facialMoodMirror = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;

    // multer puts the file on req.file
    if (!req.file) {
      throw new AppError("Please upload a face image (field: faceImage)", 400);
    }

    const imageBase64 = imageFileToBase64(req.file.path);
    const mimeType = req.file.mimetype as string;

    // Call Gemini
    const result = await analyzeFacialMood(imageBase64, user.name, user.role);

    // Save mood entry to DB
    const moodEntry = await MoodEntry.create({
      userId: user._id,
      source: "facial_mirror",
      emotion: result.emotion,
      confidence: result.confidence,
      subEmotions: result.subEmotions,
      suggestion: result.suggestion,
      alertFamily: result.alertFamily,
      imagePath: req.file.path,
    });

    // Emit socket alert if family attention needed
    if (result.alertFamily) {
      const io = req.app.get("io");
      if (io) {
        io.to(`family:${user._id}`).emit("mood_alert", {
          userId: user._id,
          userName: user.name,
          emotion: result.emotion,
          message: `${user.name} appears to be feeling ${result.emotion}. Please check in.`,
          timestamp: new Date(),
        });
      }
    }

    res
      .status(200)
      .json(new ApiResponse(200, { moodEntry, analysis: result }, "Mood analysis complete"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 2. VOICE EMOTION GUARDIAN
//    POST /api/ai/voice-emotion
//    Body: { transcribedText: string }
// ═══════════════════════════════════════════════════════════════

export const voiceEmotionGuardian = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { transcribedText } = req.body;

    if (!transcribedText || typeof transcribedText !== "string") {
      throw new AppError("transcribedText is required", 400);
    }

    const result = await analyzeVoiceEmotion(
      transcribedText,
      user.name,
      user.role
    );

    // Save mood entry
    const moodEntry = await MoodEntry.create({
      userId: user._id,
      source: "voice_emotion",
      emotion: result.emotion,
      stressLevel: result.stressLevel,
      energyLevel: result.energyLevel,
      suggestion: result.suggestion,
      alertFamily: result.alertFamily,
      transcribedText,
    });

    // Alert family if high stress detected
    if (result.alertFamily) {
      const io = req.app.get("io");
      if (io) {
        io.to(`family:${user._id}`).emit("voice_emotion_alert", {
          userId: user._id,
          userName: user.name,
          emotion: result.emotion,
          stressLevel: result.stressLevel,
          message: `${user.name}'s voice suggests they may be ${result.emotion}. Consider calling them.`,
          timestamp: new Date(),
        });
      }
    }

    res
      .status(200)
      .json(new ApiResponse(200, { moodEntry, analysis: result }, "Voice emotion analysis complete"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 3. DOCTOR SLIP SCANNER
//    POST /api/ai/scan-doctor-slip
//    Body: multipart/form-data with field "slipImage" (file)
// ═══════════════════════════════════════════════════════════════

export const doctorSlipScanner = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;

    if (!req.file) {
      throw new AppError("Please upload a prescription image (field: slipImage)", 400);
    }

    const imageBase64 = imageFileToBase64(req.file.path);
    const mimeType = req.file.mimetype as string;

    const result = await scanDoctorSlip(imageBase64, mimeType);

    // Auto-create Medicine records from scanned data
    const createdMedicines = [];
    for (const med of result.medicines) {
      if (med.name) {
        const medicine = await Medicine.create({
          userId: user._id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          source: "doctor_slip",
          slipImagePath: req.file.path,
          active: true,
        });
        createdMedicines.push(medicine);
      }
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { scannedData: result, medicinesCreated: createdMedicines },
        `Prescription scanned. ${createdMedicines.length} medicine(s) added.`
      )
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 4. INJURY PHOTO ANALYZER
//    POST /api/ai/analyze-injury
//    Body: multipart/form-data with "injuryImage" + optional bodyPart, description
// ═══════════════════════════════════════════════════════════════

export const injuryPhotoAnalyzer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { bodyPart = "unknown", description = "" } = req.body;

    if (!req.file) {
      throw new AppError("Please upload an injury image (field: injuryImage)", 400);
    }

    const imageBase64 = imageFileToBase64(req.file.path);
    const mimeType = req.file.mimetype as string;

    const result = await analyzeInjuryPhoto(
      imageBase64,
      bodyPart,
      description,
      mimeType
    );

    // Alert family for severe/critical injuries
    if (result.severity === "severe" || result.severity === "critical" || result.requiresEmergency) {
      const io = req.app.get("io");
      if (io) {
        io.to(`family:${user._id}`).emit("injury_alert", {
          userId: user._id,
          userName: user.name,
          severity: result.severity,
          possibleInjury: result.possibleInjury,
          requiresEmergency: result.requiresEmergency,
          message: `URGENT: ${user.name} has a ${result.severity} injury (${result.possibleInjury}). ${result.requiresEmergency ? "Emergency services may be needed!" : "Please check on them."}`,
          timestamp: new Date(),
        });
      }
    }

    res.status(200).json(
      new ApiResponse(200, { analysis: result, imagePath: req.file.path }, "Injury analysis complete")
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// 5. RECIPE SUGGESTER
//    POST /api/ai/suggest-recipes
//    Body: { healthConditions[], dietaryRestrictions[], availableIngredients[], mealType, count }
// ═══════════════════════════════════════════════════════════════

export const recipeSuggester = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const {
      healthConditions = [],
      dietaryRestrictions = [],
      availableIngredients = [],
      mealType = "lunch",
      count = 3,
    } = req.body;

    const recipes = await suggestRecipes(
      healthConditions,
      dietaryRestrictions,
      availableIngredients,
      mealType,
      Math.min(count, 5) // cap at 5 recipes
    );

    res
      .status(200)
      .json(new ApiResponse(200, { recipes }, `${recipes.length} recipes suggested`));
  }
);

// ═══════════════════════════════════════════════════════════════
// 6. MEDICINE INTERACTION CHECKER
//    POST /api/ai/check-interactions
//    Body: { medicines: string[], patientAge?, conditions? }
// ═══════════════════════════════════════════════════════════════

export const medicineInteractionChecker = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { medicines, patientAge, conditions = [] } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      throw new AppError("Please provide at least 2 medicine names in an array", 400);
    }

    const result = await checkMedicineInteractions(medicines, patientAge, conditions);

    // Alert family if high-risk interaction found
    if (result.consultDoctor) {
      const io = req.app.get("io");
      if (io && req.user) {
        io.to(`family:${req.user._id}`).emit("medicine_interaction_alert", {
          userId: req.user._id,
          userName: req.user.name,
          medicines,
          safe: result.safe,
          message: `Medicine interaction warning for ${req.user.name}. Please consult a doctor.`,
          timestamp: new Date(),
        });
      }
    }

    res
      .status(200)
      .json(new ApiResponse(200, result, "Medicine interaction check complete"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 7. PERSONALISED SLEEP STORY
//    POST /api/ai/sleep-story
//    Body: { mood?, preferences: { theme?, length?, language? } }
// ═══════════════════════════════════════════════════════════════

export const sleepStoryGenerator = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { mood = "tired", preferences = {} } = req.body;

    const story = await generateSleepStory(user.name, mood, preferences);

    // Save story to UserStory collection
    const savedStory = await UserStory.create({
      userId: user._id,
      title: story.title,
      content: story.story,
      type: "sleep_story",
      theme: story.theme,
      duration: story.duration,
      mood,
    });

    res
      .status(200)
      .json(new ApiResponse(200, { story: savedStory, content: story }, "Sleep story generated"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 8. EMOTION TREND FORECASTER
//    GET /api/ai/emotion-trend
//    Query: ?days=14 (default 14)
// ═══════════════════════════════════════════════════════════════

export const emotionTrendForecaster = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const days = parseInt(req.query.days as string) || 14;

    // Fetch recent mood history from DB
    const since = new Date();
    since.setDate(since.getDate() - days);

    const moodHistory = await MoodEntry.find({
      userId: user._id,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: 1 })
      .select("emotion moodScore notes createdAt")
      .lean();

    if (moodHistory.length < 3) {
      throw new AppError("Need at least 3 mood entries for trend analysis", 400);
    }

    // Format for Gemini
    const formattedHistory = moodHistory.map((m) => ({
      date: (m.createdAt as Date).toISOString().split("T")[0],
      emotion: m.emotion as string,
      moodScore: (m.moodScore as number) ?? 5,
      notes: m.notes as string | undefined,
    }));

    const forecast = await forecastEmotionTrend(formattedHistory, user.name, user.role);

    // Alert family if trend is declining
    if (forecast.alertFamily) {
      const io = req.app.get("io");
      if (io) {
        io.to(`family:${user._id}`).emit("emotion_trend_alert", {
          userId: user._id,
          userName: user.name,
          trend: forecast.trend,
          message: `${user.name}'s emotional trend is ${forecast.trend}. Consider spending more time with them.`,
          timestamp: new Date(),
        });
      }
    }

    res
      .status(200)
      .json(new ApiResponse(200, forecast, "Emotion trend forecast complete"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 9. AI MEMORY COMPANION
//    POST /api/ai/memory-companion
//    Body: { message: string }
// ═══════════════════════════════════════════════════════════════

export const memoryCompanionChat = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      throw new AppError("message is required", 400);
    }

    // Fetch user's stored memories
    const memories = await UserStory.find({ userId: user._id, type: "memory" })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title content createdAt tags")
      .lean();

    const formattedMemories = memories.map((m) => ({
      title: m.title as string,
      content: m.content as string,
      date: (m.createdAt as Date)?.toISOString().split("T")[0],
      tags: m.tags as string[] | undefined,
    }));

    const result = await aiMemoryCompanion(message, user.name, formattedMemories);

    // Save this exchange as a chat message
    await ChatMessage.create({
      senderId: user._id,
      receiverId: null, // AI conversation
      type: "memory_companion",
      userMessage: message,
      aiResponse: result.response,
      memoriesReferenced: result.memoriesReferenced,
      newTopics: result.newTopics,
      emotionalTone: result.emotionalTone,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Memory companion response ready"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 10. SMART CHATBOT
//     POST /api/ai/chat
//     Body: { message: string, history?: [{role, content}] }
// ═══════════════════════════════════════════════════════════════

export const smartChatbotController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      throw new AppError("message is required", 400);
    }

    const result = await smartChatbot(message, user.name, user.role, history);

    // Save chat message to DB
    await ChatMessage.create({
      senderId: user._id,
      receiverId: null,
      type: "smart_chatbot",
      userMessage: message,
      aiResponse: result.reply,
      intent: result.intent,
    });

    // Alert family if escalation needed
    if (result.escalateToHuman) {
      const io = req.app.get("io");
      if (io) {
        io.to(`family:${user._id}`).emit("chatbot_escalation", {
          userId: user._id,
          userName: user.name,
          userMessage: message,
          intent: result.intent,
          message: `${user.name} needs human assistance. They asked: "${message.substring(0, 50)}..."`,
          timestamp: new Date(),
        });
      }
    }

    res
      .status(200)
      .json(new ApiResponse(200, result, "Chatbot response ready"));
  }
);

// ═══════════════════════════════════════════════════════════════
// 11. MOOD COMPASS
//     POST /api/ai/mood-compass
//     Body: { feelingDescription: string, timeOfDay? }
// ═══════════════════════════════════════════════════════════════

export const moodCompassController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { feelingDescription, timeOfDay = "afternoon" } = req.body;

    if (!feelingDescription || typeof feelingDescription !== "string") {
      throw new AppError("feelingDescription is required", 400);
    }

    const result = await getMoodCompassSuggestions(
      feelingDescription,
      user.name,
      user.role,
      timeOfDay
    );

    // Save mood compass entry
    await MoodEntry.create({
      userId: user._id,
      source: "mood_compass",
      emotion: result.currentMood,
      moodScore: result.moodScore,
      feelingDescription,
      activities: result.activities,
      affirmation: result.affirmation,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Mood compass suggestions ready"));
  }
);

// ═══════════════════════════════════════════════════════════════
// GET MOOD HISTORY
//    GET /api/ai/mood-history
//    Query: ?limit=20&source=facial_mirror
// ═══════════════════════════════════════════════════════════════

export const getMoodHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const limit = parseInt(req.query.limit as string) || 20;
    const source = req.query.source as string | undefined;

    const query: Record<string, unknown> = { userId: user._id };
    if (source) query.source = source;

    const moods = await MoodEntry.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res
      .status(200)
      .json(new ApiResponse(200, { moods, total: moods.length }, "Mood history fetched"));
  }
);
