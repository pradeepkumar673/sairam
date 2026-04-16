/**
 * ai.controller.ts — Fixed + Extended + Robust (Dual-AI)
 * Merged version: User's fixes + All existing core features + Robust Dual-AI fallbacks.
 */

import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import MoodEntry from "../models/MoodEntry";
import FamilyLink from "../models/FamilyLink";
import MedicineLog from "../models/MedicineLog";
import SOSAlert from "../models/SOSAlert";
import FallEvent from "../models/FallEvent";
import VideoCallLog from "../models/VideoCallLog";
import GameScore from "../models/GameScore";
import UserStory from "../models/UserStory";
import {
  analyzeFacialMood,
  analyzeVoiceEmotionGemini,
  scanDoctorSlipGemini,
  analyzeInjuryGemini,
  getMoodCompassGemini,
  forecastEmotionTrendGemini,
  suggestRecipeGemini,
  checkMedicineInteractionGemini,
  generateSleepStoryGemini,
  chatWithCompanionGemini,
  getWeatherHealthNudge,
  getMemoryFollowUpQuestion
} from "../helpers/gemini.helper";
import {
  analyzeFacialMoodHF,
  analyzeVoiceEmotionHF,
  scanDoctorSlipHF,
  analyzeInjuryHF,
  suggestRecipeHF,
  generateSleepStoryHF
} from "../helpers/hf.helper";
import { imageFileToBase64, getMimeType } from "../config/gemini";

// ── Mood Mirror ───────────────────────────────────────────────────────────────
export const analyzeMood = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError("Image is required for mood analysis.", 400);

  const user = req.user!;
  const imageBase64 = imageFileToBase64(req.file.path);

  let result;
  try {
    console.log("Attempting Mood Mirror with Hugging Face...");
    result = await analyzeFacialMoodHF(imageBase64, user.firstName, user.role);
  } catch (err: any) {
    console.warn("HF mood analysis failed, falling back to Gemini:", err.message);
    result = await analyzeFacialMood(imageBase64, user.firstName, user.role);
  }

  await MoodEntry.create({
    userId: user._id,
    mood: result.emotion,
    moodScore: result.confidence,
    source: "facial",
    notes: result.suggestion,
    aiInsights: result.subEmotions,
  });

  res.status(200).json(new ApiResponse(200, result, "Mood analyzed."));
});

// ── Voice Emotion ─────────────────────────────────────────────────────────────
export const analyzeVoiceEmotion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { text, transcribedText } = req.body;
  const input = text || transcribedText;
  if (!input || !input.trim()) throw new AppError("Text or transcription is required.", 400);

  const user = req.user!;
  let result;
  try {
    console.log("Attempting Voice Emotion with Hugging Face...");
    result = await analyzeVoiceEmotionHF(input, user.firstName, user.role);
  } catch (err: any) {
    console.warn("HF voice emotion failed, falling back to Gemini:", err.message);
    result = await analyzeVoiceEmotionGemini(input, user.firstName, user.role);
  }

  await MoodEntry.create({
    userId: user._id,
    mood: result.emotion,
    moodScore: result.stressLevel === "low" ? 70 : result.stressLevel === "medium" ? 45 : 20,
    source: "voice",
    notes: result.suggestion,
  });

  res.status(200).json(new ApiResponse(200, result, "Voice emotion analyzed."));
});

// ── Doctor Slip Scanner ───────────────────────────────────────────────────────
export const scanPrescription = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError("No image uploaded.", 400);

  const imageBase64 = imageFileToBase64(req.file.path);
  const mimeType = getMimeType(req.file.originalname);

  let result;
  try {
    console.log("Attempting Prescription Scan with Hugging Face...");
    result = await scanDoctorSlipHF(imageBase64);
  } catch (err: any) {
    console.warn("HF scan failed, falling back to Gemini:", err.message);
    result = await scanDoctorSlipGemini(imageBase64, mimeType);
  }

  res.status(200).json(new ApiResponse(200, result, "Prescription scanned."));
});

// ── Injury / Wound Analyzer ───────────────────────────────────────────────────
export const analyzeInjury = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError("Photo is required for injury analysis.", 400);

  const imageBase64 = imageFileToBase64(req.file.path);
  const mimeType = getMimeType(req.file.originalname);

  let result;
  try {
    console.log("Attempting Injury Analysis with Hugging Face...");
    result = await analyzeInjuryHF(imageBase64);
  } catch (err: any) {
    console.warn("HF injury analysis failed, falling back to Gemini:", err.message);
    result = await analyzeInjuryGemini(imageBase64, mimeType);
  }

  res.status(200).json(new ApiResponse(200, result, "Injury analyzed."));
});

// ── Recipe Suggester ──────────────────────────────────────────────────────────
export const suggestRecipe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ingredients, restrictions, dietaryRestrictions, mood, moodContext } = req.body;
  const finalIngredients = ingredients || [];
  const finalRestrictions = restrictions || dietaryRestrictions || [];
  const finalMood = mood || moodContext || "neutral";

  if (!Array.isArray(finalIngredients) || finalIngredients.length === 0) {
    throw new AppError("At least one ingredient is required.", 400);
  }

  let result;
  try {
    console.log("Attempting Recipe Suggestion with Hugging Face...");
    result = await suggestRecipeHF(finalIngredients, finalRestrictions, finalMood);
  } catch (err) {
    console.error("HF Recipe Suggestion failed, falling back to Gemini:", (err as any).message);
    result = await suggestRecipeGemini(finalIngredients, finalRestrictions, finalMood);
  }

  res.status(200).json(new ApiResponse(200, result, "Recipes suggested."));
});

// ── Sleep Story ───────────────────────────────────────────────────────────────
export const getSleepStory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { preferences, mood: manualMood } = req.body;

  const latestMood = await MoodEntry.findOne({ userId: user._id }).sort({ createdAt: -1 });
  const mood = manualMood || latestMood?.mood || "calm";

  let result;
  try {
    console.log("Attempting Sleep Story with Hugging Face...");
    result = await generateSleepStoryHF(user.firstName, mood, preferences);
  } catch (err) {
    console.error("HF Sleep Story failed, falling back to Gemini:", (err as any).message);
    result = await generateSleepStoryGemini(user.firstName, mood, preferences);
  }

  res.status(200).json(new ApiResponse(200, result, "Sleep story generated."));
});

// ── Mood History & Compass ───────────────────────────────────────────────────
export const getMoodHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
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

export const saveMoodEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { mood, moodScore, notes, tags } = req.body;
  const entry = await MoodEntry.create({ userId: req.user!._id, mood, moodScore, source: "manual", notes, tags });
  res.status(201).json(new ApiResponse(201, entry, "Mood entry saved."));
});

export const getMoodCompass = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const recentMoods = await MoodEntry.find({
    userId,
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 }).limit(10);

  const result = await getMoodCompassGemini(recentMoods, req.user!.firstName);
  res.status(200).json(new ApiResponse(200, result, "Mood compass generated."));
});

export const getEmotionTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const moodHistory = await MoodEntry.find({
    userId,
    createdAt: { $gte: since },
  }).sort({ createdAt: 1 });

  if (moodHistory.length === 0) {
    return res.status(200).json(new ApiResponse(200, {
      trend: "stable",
      forecast: "No mood data yet.",
      recommendations: ["Start logging your mood daily."],
    }));
  }

  const result = await forecastEmotionTrendGemini(moodHistory, req.user!.firstName);
  res.status(200).json(new ApiResponse(200, result));
});

// ── Memory Stories ───────────────────────────────────────────────────────────
export const getMemoryStories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stories = await UserStory.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, { stories }));
});

export const addMemoryStory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content, tags, mediaUrl } = req.body;
  if (!title || !content) throw new AppError("Title and content required.", 400);
  const story = await UserStory.create({ userId: req.user!._id, title, content, tags, mediaUrl });
  res.status(201).json(new ApiResponse(201, story, "Memory story saved."));
});

export const getMemoryFollowUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { storyId } = req.params;
  const story = await UserStory.findOne({ _id: storyId, userId: req.user!._id });
  if (!story) throw new AppError("Story not found.", 404);
  const question = await getMemoryFollowUpQuestion(story);
  res.status(200).json(new ApiResponse(200, { question }));
});

// ── Medicine & Chat ──────────────────────────────────────────────────────────
export const checkMedicineInteraction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { medicines } = req.body;
  if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
    throw new AppError("At least two medicine names are required.", 400);
  }
  const result = await checkMedicineInteractionGemini(medicines);
  res.status(200).json(new ApiResponse(200, result));
});

export const companionChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, conversationHistory } = req.body;
  const result = await chatWithCompanionGemini(message, conversationHistory || [], req.user);
  res.status(200).json(new ApiResponse(200, result));
});

// ── Games ───────────────────────────────────────────────────────────────────
export const getGameScores = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { gameName } = req.query;
  const filter: any = { userId: req.user!._id };
  if (gameName) filter.gameName = gameName;
  const scores = await GameScore.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  res.status(200).json(new ApiResponse(200, { scores }));
});

export const saveGameScore = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { gameName, score, level, duration, metadata } = req.body;
  const gameScore = await GameScore.create({ userId: req.user!._id, gameName, score, level, duration, metadata });
  res.status(201).json(new ApiResponse(201, gameScore, "Score saved."));
});

// ── Dashboard & Logistics ─────────────────────────────────────────────────────
export const getWeatherNudge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const nudge = await getWeatherHealthNudge(req.user!.firstName);
  res.status(200).json(new ApiResponse(200, { nudge }));
});

export const getFamilyDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const links = await FamilyLink.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  }).populate("requester recipient", "_id firstName lastName");

  const memberIds = links.map((link: any) => {
    const other = link.requester._id.toString() === userId.toString() ? link.recipient._id : link.requester._id;
    return other;
  });
  memberIds.push(userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const moodEntries = await MoodEntry.find({ userId: { $in: memberIds }, createdAt: { $gte: today } }).lean();
  const logs = await MedicineLog.find({ user: { $in: memberIds }, scheduledTime: { $gte: today } });
  const compliance = logs.length > 0
    ? Math.round((logs.filter((l: any) => l.status === "taken").length / logs.length) * 100)
    : 100;

  const recentSOS = await SOSAlert.find({
    triggeredBy: { $in: memberIds },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  }).sort({ createdAt: -1 }).limit(5).populate("triggeredBy", "firstName lastName");

  const recentFalls = await FallEvent.find({
    userId: { $in: memberIds },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  }).sort({ createdAt: -1 }).limit(5).populate("userId", "firstName lastName");

  res.status(200).json(new ApiResponse(200, {
    moodSummary: moodEntries,
    complianceRate: compliance,
    recentAlerts: { sos: recentSOS, falls: recentFalls }
  }));
});

export const logVideoCall = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { familyId, participants, duration, callType, status, notes } = req.body;
  const log = await VideoCallLog.create({
    initiatedBy: req.user!._id,
    familyId,
    participants,
    duration,
    callType: callType || "video",
    status: status || "completed",
    notes,
  });
  res.status(201).json(new ApiResponse(201, log, "Video call logged."));
});

export const getVideoCallLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const logs = await VideoCallLog.find({ participants: req.user!._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("participants", "firstName lastName avatar")
    .lean();
  res.status(200).json(new ApiResponse(200, { logs }));
});