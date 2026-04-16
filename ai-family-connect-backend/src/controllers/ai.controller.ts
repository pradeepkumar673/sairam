/**
 * controllers/ai.controller.ts
 * Handlers for all AI-powered features
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import MoodEntry from "../models/MoodEntry";
import UserStory from "../models/UserStory";
import GameScore from "../models/GameScore";
import VideoCallLog from "../models/VideoCallLog";
import FamilyLink from "../models/FamilyLink";
import MedicineLog from "../models/MedicineLog";
import SOSAlert from "../models/SOSAlert";
import FallEvent from "../models/FallEvent";
import { imageFileToBase64, getMimeType } from "../config/gemini";
import {
  analyzeFacialMood,
  analyzeVoiceEmotionGemini,
  getMoodCompassGemini,
  forecastEmotionTrendGemini,
  suggestRecipeGemini,
  checkMedicineInteractionGemini,
  generateSleepStoryGemini,
  chatWithCompanionGemini,
  getMemoryFollowUpQuestion,
  getWeatherHealthNudge,
} from "../helpers/gemini.helper";

// Mood Mirror
export const analyzeMood = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  if (!req.file) throw new AppError("Photo is required for mood analysis.", 400);

  const imagePath = req.file.path;
  const imageBase64 = imageFileToBase64(imagePath);
  const mimeType = getMimeType(req.file.originalname);
  const result = await analyzeFacialMood(imageBase64, (req as any).user.firstName, (req as any).user.role);

  await MoodEntry.create({
    userId,
    mood: result.emotion,
    moodScore: result.confidence,
    source: "facial",
    notes: result.suggestion,
    aiInsights: result.subEmotions,
  });

  res.status(200).json(new ApiResponse(200, result, "Mood analyzed."));
});

export const analyzeVoiceEmotion = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { transcribedText } = req.body;
  if (!transcribedText) throw new AppError("Transcribed text is required.", 400);

  const result = await analyzeVoiceEmotionGemini(transcribedText, (req as any).user.firstName, (req as any).user.role);

  await MoodEntry.create({
    userId,
    mood: result.emotion,
    moodScore: result.stressLevel === "high" ? 30 : result.stressLevel === "medium" ? 50 : 70,
    source: "voice",
    notes: result.suggestion,
  });

  res.status(200).json(new ApiResponse(200, result, "Voice emotion analyzed."));
});

export const getMoodCompassSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const recentMoods = await MoodEntry.find({ userId }).sort({ createdAt: -1 }).limit(7).lean();
  const result = await getMoodCompassGemini(recentMoods, (req as any).user.firstName);
  res.status(200).json(new ApiResponse(200, result));
});

export const forecastEmotionTrend = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const moodHistory = await MoodEntry.find({ userId }).sort({ createdAt: -1 }).limit(30).lean();
  if (moodHistory.length < 5) throw new AppError("Need at least 5 mood entries.", 400);
  const result = await forecastEmotionTrendGemini(moodHistory, (req as any).user.firstName);
  res.status(200).json(new ApiResponse(200, result));
});

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

export const saveMoodEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { mood, moodScore, notes, tags } = req.body;
  const entry = await MoodEntry.create({ userId, mood, moodScore, source: "manual", notes, tags });
  res.status(201).json(new ApiResponse(201, entry, "Mood entry saved."));
});

export const suggestRecipe = asyncHandler(async (req: Request, res: Response) => {
  const { ingredients, dietaryRestrictions, moodContext } = req.body;
  if (!ingredients || !ingredients.length) throw new AppError("Provide at least one ingredient.", 400);
  const result = await suggestRecipeGemini(ingredients, dietaryRestrictions, moodContext);
  res.status(200).json(new ApiResponse(200, result));
});

export const checkMedicineInteraction = asyncHandler(async (req: Request, res: Response) => {
  const { medicines } = req.body;
  if (!medicines || medicines.length < 2) throw new AppError("Provide at least 2 medicines.", 400);
  const result = await checkMedicineInteractionGemini(medicines);
  res.status(200).json(new ApiResponse(200, result));
});

export const generateSleepStory = asyncHandler(async (req: Request, res: Response) => {
  const { userName, mood, preferences } = req.body;
  const result = await generateSleepStoryGemini(userName, mood, preferences);
  res.status(200).json(new ApiResponse(200, result));
});

export const getMemoryStories = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const stories = await UserStory.find({ userId }).sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, { stories }));
});

export const addMemoryStory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { title, content, tags, mediaUrl } = req.body;
  if (!title || !content) throw new AppError("Title and content required.", 400);
  const story = await UserStory.create({ userId, title, content, tags, mediaUrl });
  res.status(201).json(new ApiResponse(201, story, "Memory story saved."));
});

export const getMemoryFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { storyId } = req.params;
  const story = await UserStory.findOne({ _id: storyId, userId });
  if (!story) throw new AppError("Story not found.", 404);
  const question = await getMemoryFollowUpQuestion(story);
  res.status(200).json(new ApiResponse(200, { question }));
});

export const chatWithCompanion = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { message, conversationHistory } = req.body;
  if (!message?.trim()) throw new AppError("Message cannot be empty.", 400);
  const result = await chatWithCompanionGemini(message, conversationHistory || [], (req as any).user);
  res.status(200).json(new ApiResponse(200, result));
});

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
  if (!gameName || score === undefined) throw new AppError("gameName and score required.", 400);
  const gameScore = await GameScore.create({ userId, gameName, score, level, duration, metadata });
  res.status(201).json(new ApiResponse(201, gameScore, "Score saved."));
});

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
    .populate("participants", "firstName lastName avatar")
    .lean();
  res.status(200).json(new ApiResponse(200, { logs }));
});

export const getWeatherNudge = asyncHandler(async (req: Request, res: Response) => {
  const nudge = await getWeatherHealthNudge((req as any).user.firstName);
  res.status(200).json(new ApiResponse(200, { nudge }));
});

export const getFamilyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  // Family members list
  const links = await FamilyLink.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  }).populate("requester recipient", "_id firstName lastName");

  const memberIds = links.map((link: any) => {
    const other = link.requester._id.toString() === userId ? link.recipient._id : link.requester._id;
    return other;
  });
  memberIds.push(userId);

  // Today's mood summary
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const moodEntries = await MoodEntry.find({
    userId: { $in: memberIds },
    createdAt: { $gte: today },
  }).lean();

  // Compliance summary
  const logs = await MedicineLog.find({
    user: { $in: memberIds },
    scheduledTime: { $gte: today },
  });
  const compliance = logs.length > 0
    ? Math.round((logs.filter((l: any) => l.status === "taken").length / logs.length) * 100)
    : 100;

  // Recent alerts
  const recentSOS = await SOSAlert.find({
    triggeredBy: { $in: memberIds },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  }).sort({ createdAt: -1 }).limit(5).populate("triggeredBy", "firstName lastName");

  const recentFalls = await FallEvent.find({
    userId: { $in: memberIds },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  }).sort({ createdAt: -1 }).limit(5).populate("userId", "firstName lastName");

  res.status(200).json(new ApiResponse(200, {
    moodSummary: moodEntries,
    complianceRate: compliance,
    recentAlerts: { sos: recentSOS, falls: recentFalls },
  }));
});