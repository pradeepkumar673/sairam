/**
 * controllers/ai.controller.ts
 * Handlers for all AI-powered features — calls gemini.helper.ts
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import MoodEntry from "../models/MoodEntry";
import UserStory from "../models/UserStory";
import GameScore from "../models/GameScore";
import VideoCallLog from "../models/VideoCallLog";
import {
  analyzeFacialMood,
  analyzeVoiceEmotionGemini,
  scanDoctorSlipGemini,
  analyzeInjuryGemini,
  suggestRecipeGemini,
  checkMedicineInteractionGemini,
  generateSleepStoryGemini,
  forecastEmotionTrendGemini,
  getMoodCompassGemini,
  chatWithCompanionGemini,
} from "../helpers/gemini.helper";

// ── Facial Mood Mirror ─────────────────────────────────────────────
export const analyzeMood = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  if (!req.file) throw new AppError("Photo is required for mood analysis.", 400);

  const imageBase64 = req.file.buffer?.toString("base64") || "";
  const result = await analyzeFacialMood(imageBase64, req.file.mimetype);

  // Auto-save mood entry
  await MoodEntry.create({
    userId,
    mood: result.mood,
    moodScore: result.score,
    source: "facial",
    notes: result.notes,
    aiInsights: result.insights,
  });

  res.status(200).json(new ApiResponse(200, result, "Mood analyzed successfully."));
});

// ── Voice Emotion Guardian ─────────────────────────────────────────
export const analyzeVoiceEmotion = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  if (!req.file) throw new AppError("Audio file is required.", 400);

  const result = await analyzeVoiceEmotionGemini(req.file.buffer, req.file.mimetype);

  await MoodEntry.create({
    userId,
    mood: result.mood,
    moodScore: result.score,
    source: "voice",
    notes: result.notes,
    aiInsights: result.insights,
  });

  res.status(200).json(new ApiResponse(200, result, "Voice emotion analyzed."));
});

// ── Save Mood Entry manually ───────────────────────────────────────
export const saveMoodEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { mood, moodScore, notes, tags } = req.body;

  const entry = await MoodEntry.create({
    userId,
    mood,
    moodScore,
    source: "manual",
    notes,
    tags,
  });

  res.status(201).json(new ApiResponse(201, entry, "Mood entry saved."));
});

// ── Mood History ───────────────────────────────────────────────────
export const getMoodHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const limit = parseInt(req.query.limit as string) || 30;
  const days = parseInt(req.query.days as string) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const entries = await MoodEntry.find({ userId, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json(new ApiResponse(200, { entries, days }));
});

// ── Mood Compass Suggestions ───────────────────────────────────────
export const getMoodCompassSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  // Get last 7 mood entries for context
  const recentMoods = await MoodEntry.find({ userId })
    .sort({ createdAt: -1 })
    .limit(7)
    .lean();

  const result = await getMoodCompassGemini(recentMoods);
  res.status(200).json(new ApiResponse(200, result, "Mood compass suggestions ready."));
});

// ── Emotion Trend Forecaster ───────────────────────────────────────
export const forecastEmotionTrend = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const moodHistory = await MoodEntry.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  if (moodHistory.length < 5) {
    throw new AppError("Need at least 5 mood entries to generate a forecast.", 400);
  }

  const result = await forecastEmotionTrendGemini(moodHistory);
  res.status(200).json(new ApiResponse(200, result, "Emotion trend forecast ready."));
});

// ── Doctor Slip Scanner ────────────────────────────────────────────
export const scanDoctorSlip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError("Doctor slip image required.", 400);

  const imageBase64 = req.file.buffer?.toString("base64") || "";
  const result = await scanDoctorSlipGemini(imageBase64, req.file.mimetype);

  res.status(200).json(new ApiResponse(200, result, "Doctor slip scanned."));
});

// ── Injury Photo Analyzer ──────────────────────────────────────────
export const analyzeInjuryPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError("Injury photo required.", 400);

  const imageBase64 = req.file.buffer?.toString("base64") || "";
  const result = await analyzeInjuryGemini(imageBase64, req.file.mimetype);

  res.status(200).json(new ApiResponse(200, result, "Injury photo analyzed."));
});

// ── Recipe Suggester ───────────────────────────────────────────────
export const suggestRecipe = asyncHandler(async (req: Request, res: Response) => {
  const { ingredients, dietaryRestrictions, moodContext } = req.body;
  if (!ingredients || !ingredients.length) {
    throw new AppError("Please provide at least one ingredient.", 400);
  }

  const result = await suggestRecipeGemini(ingredients, dietaryRestrictions, moodContext);
  res.status(200).json(new ApiResponse(200, result, "Recipe suggestions ready."));
});

// ── Medicine Interaction Checker ───────────────────────────────────
export const checkMedicineInteraction = asyncHandler(async (req: Request, res: Response) => {
  const { medicines } = req.body;
  if (!medicines || medicines.length < 2) {
    throw new AppError("Provide at least 2 medicines to check interactions.", 400);
  }

  const result = await checkMedicineInteractionGemini(medicines);
  res.status(200).json(new ApiResponse(200, result, "Interaction check complete."));
});

// ── Personalized Sleep Story ───────────────────────────────────────
export const generateSleepStory = asyncHandler(async (req: Request, res: Response) => {
  const { userName, age, preferences, duration } = req.body;
  const result = await generateSleepStoryGemini(userName, age, preferences, duration);
  res.status(200).json(new ApiResponse(200, result, "Sleep story generated."));
});

// ── AI Memory Companion — Get Stories ─────────────────────────────
export const getMemoryStories = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const stories = await UserStory.find({ userId }).sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, { stories }));
});

// ── AI Memory Companion — Add Story ───────────────────────────────
export const addMemoryStory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { title, content, tags, mediaUrl } = req.body;

  if (!title || !content) throw new AppError("Title and content are required.", 400);

  const story = await UserStory.create({ userId, title, content, tags, mediaUrl });
  res.status(201).json(new ApiResponse(201, story, "Memory story saved."));
});

// ── Smart Chatbot ──────────────────────────────────────────────────
export const chatWithCompanion = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { message, conversationHistory } = req.body;

  if (!message?.trim()) throw new AppError("Message cannot be empty.", 400);

  const result = await chatWithCompanionGemini(
    message,
    conversationHistory || [],
    (req as any).user
  );

  res.status(200).json(new ApiResponse(200, result, "Chatbot response ready."));
});

// ── Game Score ─────────────────────────────────────────────────────
export const getGameScores = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { gameName } = req.query;

  const filter: any = { userId };
  if (gameName) filter.gameName = gameName;

  const scores = await GameScore.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  res.status(200).json(new ApiResponse(200, { scores }));
});

export const saveGameScore = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { gameName, score, level, duration, metadata } = req.body;

  if (!gameName || score === undefined) {
    throw new AppError("gameName and score are required.", 400);
  }

  const gameScore = await GameScore.create({
    userId,
    gameName,
    score,
    level,
    duration,
    metadata,
  });

  res.status(201).json(new ApiResponse(201, gameScore, "Score saved."));
});

// ── Video Call Log ─────────────────────────────────────────────────
export const logVideoCall = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { familyId, participants, duration, callType, status, notes } = req.body;

  const log = await VideoCallLog.create({
    initiatedBy: userId,
    familyId,
    participants,
    duration,
    callType: callType || "video",
    status: status || "completed",
    notes,
  });

  res.status(201).json(new ApiResponse(201, log, "Video call logged."));
});

export const getVideoCallLogs = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const limit = parseInt(req.query.limit as string) || 20;

  const logs = await VideoCallLog.find({ participants: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("participants", "name avatar")
    .lean();

  res.status(200).json(new ApiResponse(200, { logs }));
});
