import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  analyzeMood,
  analyzeVoiceEmotion,
  getMoodCompassSuggestions,
  forecastEmotionTrend,
  getMoodHistory,
  saveMoodEntry,
  suggestRecipe,
  checkMedicineInteraction,
  generateSleepStory,
  getMemoryStories,
  addMemoryStory,
  getMemoryFollowUp,
  chatWithCompanion,
  getGameScores,
  saveGameScore,
  logVideoCall,
  getVideoCallLogs,
  getWeatherNudge,
  getFamilyDashboard,
  analyzeInjury,
} from "../controllers/ai.controller";
import { moodPhotoUpload } from "../config/multer";

const router = Router();
router.use(protect);

router.post("/mood-mirror", moodPhotoUpload.single("faceImage"), analyzeMood);
router.post("/voice-emotion", analyzeVoiceEmotion);
router.post("/mood-compass", getMoodCompassSuggestions);
router.get("/emotion-trend", forecastEmotionTrend);
router.get("/mood-history", getMoodHistory);
router.post("/mood-entry", saveMoodEntry);
router.post("/suggest-recipes", suggestRecipe);
router.post("/check-interactions", checkMedicineInteraction);
router.post("/sleep-story", generateSleepStory);
router.get("/memory-stories", getMemoryStories);
router.post("/memory-stories", addMemoryStory);
router.get("/memory-stories/:storyId/follow-up", getMemoryFollowUp);
router.post("/chat", chatWithCompanion);
router.get("/game-scores", getGameScores);
router.post("/game-scores", saveGameScore);
router.post("/video-call", logVideoCall);
router.get("/video-calls", getVideoCallLogs);
router.get("/weather-nudge", getWeatherNudge);
router.get("/dashboard", getFamilyDashboard);
router.post("/analyze-injury", moodPhotoUpload.single("injuryImage"), analyzeInjury);

export default router;