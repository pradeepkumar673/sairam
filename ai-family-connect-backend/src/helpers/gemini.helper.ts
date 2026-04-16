/**
 * helpers/gemini.helper.ts
 * Centralised Gemini AI helper with robust prompts for all features.
 */

import { callGemini, parseGeminiJSON } from "../config/gemini";

export interface MoodMirrorResult {
  emotion: string;
  confidence: number;
  subEmotions: string[];
  suggestion: string;
  alertFamily: boolean;
}

export interface VoiceEmotionResult {
  emotion: string;
  stressLevel: "low" | "medium" | "high";
  energyLevel: "low" | "medium" | "high";
  suggestion: string;
  alertFamily: boolean;
}

export interface DoctorSlipResult {
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  diagnosis?: string;
  doctorName?: string;
  date?: string;
  warnings: string[];
}

export interface InjuryAnalysisResult {
  severity: "minor" | "moderate" | "severe" | "critical";
  possibleInjury: string;
  immediateAction: string;
  requiresDoctor: boolean;
  requiresEmergency: boolean;
  careInstructions: string[];
}

export interface RecipeSuggestion {
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  nutritionBenefits: string;
  suitableFor: string[];
  prepTime: string;
}

export interface MedicineInteractionResult {
  safe: boolean;
  interactions: Array<{ medicines: string[]; risk: "low" | "medium" | "high"; description: string }>;
  recommendations: string[];
  consultDoctor: boolean;
}

export interface SleepStoryResult {
  title: string;
  story: string;
  duration: string;
  theme: string;
}

export interface EmotionTrendForecast {
  trend: "improving" | "stable" | "declining";
  forecast: string;
  triggers: string[];
  recommendations: string[];
  alertFamily: boolean;
}

export interface MoodCompassResult {
  currentMood: string;
  moodScore: number;
  activities: string[];
  affirmation: string;
  breathingExercise?: string;
}

export async function analyzeFacialMood(
  imageBase64: string,
  userName: string = "the user",
  userRole: string = "elder"
): Promise<MoodMirrorResult> {
  const prompt = `
You are a compassionate AI emotion analyst for a family care application.
Analyze the facial expression in this image and detect the emotional state of ${userName} (${userRole}).

Return ONLY valid JSON in this exact format:
{
  "emotion": "primary emotion (e.g., happy, sad, anxious, calm, confused, lonely, tired)",
  "confidence": number 0-100,
  "subEmotions": ["emotion1", "emotion2"],
  "suggestion": "A warm, caring 1-2 sentence message directed to a ${userRole}. Be gentle and encouraging.",
  "alertFamily": true or false (true if emotion indicates distress needing family attention)
}
`.trim();
  const raw = await callGemini({ prompt, imageBase64 });
  return parseGeminiJSON<MoodMirrorResult>(raw);
}

export async function analyzeVoiceEmotionGemini(
  transcribedText: string,
  userName: string = "the user",
  userRole: string = "elder"
): Promise<VoiceEmotionResult> {
  const prompt = `
You are an empathetic AI voice emotion analyst.
Analyze the following spoken words from ${userName} (${userRole}) for emotional cues:
"${transcribedText}"

Return ONLY valid JSON in this format:
{
  "emotion": "primary emotion (happy/sad/anxious/angry/confused/lonely/calm/distressed)",
  "stressLevel": "low|medium|high",
  "energyLevel": "low|medium|high",
  "suggestion": "A warm 1-2 sentence caring response for a ${userRole}. Be supportive and helpful.",
  "alertFamily": true/false
}
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON<VoiceEmotionResult>(raw);
}

export async function scanDoctorSlipGemini(imageBase64: string, mimeType: string): Promise<DoctorSlipResult> {
  const prompt = `
You are a medical document OCR and analysis AI.
Extract all medical information from this doctor's prescription image.

Return ONLY valid JSON in this exact format:
{
  "medicines": [
    {
      "name": "medicine name",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., twice daily",
      "duration": "e.g., 7 days",
      "instructions": "e.g., take after food"
    }
  ],
  "diagnosis": "condition if mentioned (or null)",
  "doctorName": "doctor name if visible (or null)",
  "date": "prescription date if visible (or null)",
  "warnings": ["any warnings"]
}
If unclear, make best interpretation.
`.trim();
  const raw = await callGemini({ prompt, imageBase64, imageMimeType: mimeType as any });
  return parseGeminiJSON<DoctorSlipResult>(raw);
}

export async function analyzeInjuryGemini(imageBase64: string, mimeType: string): Promise<InjuryAnalysisResult> {
  const prompt = `
You are a medical first-aid AI assistant for a family safety app.
Analyze this injury photo.

Return ONLY valid JSON:
{
  "severity": "minor|moderate|severe|critical",
  "possibleInjury": "e.g., bruise, laceration, burn, sprain, fracture",
  "immediateAction": "Most important single action to take RIGHT NOW",
  "requiresDoctor": true/false,
  "requiresEmergency": true/false,
  "careInstructions": ["Step 1", "Step 2", "Step 3"]
}
Be conservative; when in doubt, recommend seeing a doctor.
`.trim();
  const raw = await callGemini({ prompt, imageBase64, imageMimeType: mimeType as any });
  return parseGeminiJSON<InjuryAnalysisResult>(raw);
}

export async function getMoodCompassGemini(recentMoods: any[], userName: string): Promise<MoodCompassResult> {
  const moodSummary = recentMoods.map(m => `${m.mood} (score: ${m.moodScore})`).join(", ");
  const prompt = `
You are a mindful wellness coach. Based on recent moods of ${userName}: [${moodSummary}], provide personalized support.

Return JSON:
{
  "currentMood": "one-word mood label",
  "moodScore": number 1-10,
  "activities": ["activity 1", "activity 2", "activity 3"],
  "affirmation": "warm affirmation for ${userName}",
  "breathingExercise": "optional breathing exercise or null"
}
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON<MoodCompassResult>(raw);
}

export async function forecastEmotionTrendGemini(moodHistory: any[], userName: string): Promise<EmotionTrendForecast> {
  const historyText = moodHistory.map(m => `${m.createdAt}: ${m.mood} (score: ${m.moodScore})`).join("\n");
  const prompt = `
Analyze the mood history of ${userName} over the past period:
${historyText}

Return JSON:
{
  "trend": "improving|stable|declining",
  "forecast": "2-3 sentence explanation",
  "triggers": ["trigger1", "trigger2"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "alertFamily": true/false
}
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON<EmotionTrendForecast>(raw);
}

export async function suggestRecipeGemini(ingredients: string[], restrictions?: string[], mood?: string): Promise<RecipeSuggestion[]> {
  const prompt = `
You are a nutritionist AI. Suggest 3 healthy, easy recipes using: ${ingredients.join(", ")}.
Dietary restrictions: ${restrictions?.join(", ") || "none"}. Mood context: ${mood || "neutral"}.

Return JSON array of recipe objects:
[
  {
    "recipeName": "...",
    "ingredients": ["item with quantity", ...],
    "instructions": ["Step 1", "Step 2", ...],
    "nutritionBenefits": "...",
    "suitableFor": ["condition1", ...],
    "prepTime": "e.g., 20 minutes"
  }
]
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON<RecipeSuggestion[]>(raw);
}

export async function checkMedicineInteractionGemini(medicines: string[]): Promise<MedicineInteractionResult> {
  const prompt = `
Check for interactions between these medicines: ${medicines.join(", ")}.
Return JSON:
{
  "safe": true/false,
  "interactions": [{ "medicines": ["A", "B"], "risk": "low|medium|high", "description": "..." }],
  "recommendations": ["...", "..."],
  "consultDoctor": true/false
}
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON<MedicineInteractionResult>(raw);
}

export async function generateSleepStoryGemini(userName: string, mood: string, preferences?: any): Promise<SleepStoryResult> {
  const theme = preferences?.theme || "nature";
  const length = preferences?.length || "medium";
  const wordCount = length === "short" ? 150 : length === "medium" ? 300 : 500;
  const prompt = `
Create a calming bedtime story for ${userName} (mood: ${mood}, theme: ${theme}, ~${wordCount} words).
Return JSON:
{
  "title": "...",
  "story": "...",
  "duration": "estimated read time",
  "theme": "${theme}"
}
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON<SleepStoryResult>(raw);
}

export async function getMemoryFollowUpQuestion(story: any): Promise<string> {
  const prompt = `
Based on this memory story titled "${story.title}" with content: "${story.content.substring(0, 500)}...",
generate a natural follow-up question to encourage more reminiscing. Return just the question as a string, no JSON.
`.trim();
  const raw = await callGemini({ prompt });
  return raw.trim();
}

export async function chatWithCompanionGemini(message: string, history: any[], user: any): Promise<any> {
  const context = `User is ${user.firstName}, a ${user.role}.`;
  const prompt = `
You are a warm, caring AI companion named "Saathi" for a family care app.
${context}
Conversation history: ${JSON.stringify(history.slice(-6))}
User: ${message}
Respond in JSON:
{
  "reply": "your warm response (2-4 sentences, suitable for voice output)",
  "intent": "medicine_query|health_question|emotional_support|general_chat|emergency",
  "suggestedActions": ["action1", "action2"],
  "escalateToHuman": true/false
}
`.trim();
  const raw = await callGemini({ prompt });
  return parseGeminiJSON(raw);
}

export async function getWeatherHealthNudge(userName: string): Promise<string> {
  // Mock Chennai weather
  const mockWeather = "32°C, partly cloudy, humidity 70%";
  const prompt = `
Given the weather in Chennai: ${mockWeather}, provide a caring health nudge for ${userName} (e.g., stay hydrated, avoid sun). Return a short, voice-friendly sentence.
`.trim();
  const raw = await callGemini({ prompt });
  return raw.trim();
}