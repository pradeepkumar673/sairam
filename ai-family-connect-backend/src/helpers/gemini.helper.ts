/**
 * helpers/gemini.helper.ts
 * ─────────────────────────────────────────────────────────────
 * Centralised Gemini AI helper for ALL AI-powered features.
 * Each function builds the right prompt, calls the Gemini
 * REST API via axios, and returns a clean typed result.
 * ─────────────────────────────────────────────────────────────
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// ─── Types ────────────────────────────────────────────────────

export interface GeminiTextResponse {
  success: boolean;
  result: string;
  raw?: unknown;
}

export interface MoodMirrorResult {
  emotion: string;           // primary detected emotion
  confidence: number;        // 0–100
  subEmotions: string[];     // secondary emotions
  suggestion: string;        // caring follow-up message
  alertFamily: boolean;      // true if emotion needs family attention
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
  suitableFor: string[];  // e.g. ["diabetes", "hypertension"]
  prepTime: string;
}

export interface MedicineInteractionResult {
  safe: boolean;
  interactions: Array<{
    medicines: string[];
    risk: "low" | "medium" | "high";
    description: string;
  }>;
  recommendations: string[];
  consultDoctor: boolean;
}

export interface SleepStoryResult {
  title: string;
  story: string;
  duration: string;   // estimated reading/listening time
  theme: string;
}

export interface EmotionTrendForecast {
  trend: "improving" | "stable" | "declining";
  forecast: string;
  triggers: string[];
  recommendations: string[];
  alertFamily: boolean;
}

export interface MemoryCompanionResult {
  response: string;           // warm conversational reply
  memoriesReferenced: string[]; // which past memories were used
  newTopics: string[];        // new topics detected from this message
  emotionalTone: string;
}

export interface ChatbotResult {
  reply: string;
  intent: string;             // e.g. "medicine_query", "emotional_support"
  suggestedActions: string[];
  escalateToHuman: boolean;
}

export interface MoodCompassResult {
  currentMood: string;
  moodScore: number;          // 1–10
  activities: string[];       // recommended activities
  affirmation: string;
  breathingExercise?: string;
}

// ─── Gemini API caller ────────────────────────────────────────

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Core function: sends a text prompt (+ optional image) to Gemini
 * and returns the raw text response.
 */
async function callGemini(
  prompt: string,
  imageBase64?: string,
  imageMimeType: string = "image/jpeg"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");

  // Build the content parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: prompt }];

  // Attach image if provided (for vision features)
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBase64,
      },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  const text: string =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) throw new Error("Gemini returned an empty response");
  return text.trim();
}

/**
 * Helper: safely parse a JSON block that Gemini might wrap in ```json ... ```
 */
function parseGeminiJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Helper: read an uploaded image file and convert to base64
 */
export function imageFileToBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString("base64");
}

// ═══════════════════════════════════════════════════════════════
// 1. FACIAL MOOD MIRROR
//    Input: base64 image of user's face
//    Output: detected emotion + caring suggestion
// ═══════════════════════════════════════════════════════════════

export async function analyzeFacialMood(
  imageBase64: string,
  userName: string = "the user",
  userRole: string = "elder"
): Promise<MoodMirrorResult> {
  const prompt = `
You are a compassionate AI emotion analyst for a family care application.
Analyze the facial expression in this image and detect the emotional state of ${userName}.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "emotion": "primary emotion (e.g. happy, sad, anxious, calm, confused, lonely, tired)",
  "confidence": <number 0-100>,
  "subEmotions": ["emotion1", "emotion2"],
  "suggestion": "A warm, caring 1-2 sentence message directed to a ${userRole} about their emotional state. Be gentle and encouraging.",
  "alertFamily": <true if emotion is sad/anxious/distressed/lonely and needs family attention, else false>
}

Focus on genuine care. If the image is unclear, make your best assessment.
`.trim();

  const raw = await callGemini(prompt, imageBase64);
  return parseGeminiJSON<MoodMirrorResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 2. VOICE EMOTION GUARDIAN
//    Input: transcribed voice text (from frontend speech-to-text)
//    Output: emotion + stress level detected from speech patterns
// ═══════════════════════════════════════════════════════════════

export async function analyzeVoiceEmotion(
  transcribedText: string,
  userName: string = "the user",
  userRole: string = "elder"
): Promise<VoiceEmotionResult> {
  const prompt = `
You are an empathetic AI voice emotion analyst for a family care app.
Analyze the following spoken words from ${userName} (a ${userRole}) for emotional cues, stress patterns, and energy levels.

Spoken text: "${transcribedText}"

Detect emotion from:
- Word choice (negative/positive words)
- Sentence structure (fragmented = stressed)
- Expressed concerns or complaints
- Urgency or slowness in expression

Return ONLY valid JSON in this exact format:
{
  "emotion": "primary emotion (happy/sad/anxious/angry/confused/lonely/calm/distressed)",
  "stressLevel": "low|medium|high",
  "energyLevel": "low|medium|high",
  "suggestion": "A warm 1-2 sentence caring response for a ${userRole}. Be supportive and helpful.",
  "alertFamily": <true if stressLevel is high or emotion is distressed/anxious/sad>
}
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<VoiceEmotionResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 3. DOCTOR SLIP SCANNER
//    Input: image of a doctor's prescription
//    Output: structured list of medicines, dosages, instructions
// ═══════════════════════════════════════════════════════════════

export async function scanDoctorSlip(
  imageBase64: string,
  imageMimeType: string = "image/jpeg"
): Promise<DoctorSlipResult> {
  const prompt = `
You are a medical document OCR and analysis AI for a family care application.
Carefully read this doctor's prescription/slip image and extract ALL medical information.

Return ONLY valid JSON in this exact format:
{
  "medicines": [
    {
      "name": "medicine name",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. twice daily / morning and night",
      "duration": "e.g. 7 days / 2 weeks",
      "instructions": "e.g. take after food, avoid alcohol"
    }
  ],
  "diagnosis": "condition mentioned if any (or null)",
  "doctorName": "doctor name if visible (or null)",
  "date": "prescription date if visible (or null)",
  "warnings": ["any warnings or special instructions visible on the slip"]
}

If text is partially unclear, make your best interpretation. Always include at least one medicine entry.
`.trim();

  const raw = await callGemini(prompt, imageBase64, imageMimeType);
  return parseGeminiJSON<DoctorSlipResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 4. INJURY PHOTO ANALYZER
//    Input: photo of an injury + optional body part description
//    Output: severity assessment + first aid instructions
// ═══════════════════════════════════════════════════════════════

export async function analyzeInjuryPhoto(
  imageBase64: string,
  bodyPart: string = "unknown",
  description: string = "",
  imageMimeType: string = "image/jpeg"
): Promise<InjuryAnalysisResult> {
  const prompt = `
You are a medical first-aid AI assistant for a family safety app.
Analyze this injury photo on the body part: "${bodyPart}".
Additional context from user: "${description}"

Assess the injury carefully and return ONLY valid JSON:
{
  "severity": "minor|moderate|severe|critical",
  "possibleInjury": "e.g. bruise, laceration, burn, sprain, fracture",
  "immediateAction": "Most important single action to take RIGHT NOW",
  "requiresDoctor": <true if medical attention is recommended>,
  "requiresEmergency": <true if emergency services (911/ambulance) should be called immediately>,
  "careInstructions": [
    "Step 1 instruction",
    "Step 2 instruction",
    "Step 3 instruction"
  ]
}

Be conservative — when in doubt, recommend seeing a doctor.
IMPORTANT: You are providing first-aid guidance only, not a medical diagnosis.
`.trim();

  const raw = await callGemini(prompt, imageBase64, imageMimeType);
  return parseGeminiJSON<InjuryAnalysisResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 5. RECIPE SUGGESTER
//    Input: health conditions, dietary restrictions, available ingredients
//    Output: healthy recipe suggestions
// ═══════════════════════════════════════════════════════════════

export async function suggestRecipes(
  healthConditions: string[],
  dietaryRestrictions: string[],
  availableIngredients: string[],
  mealType: "breakfast" | "lunch" | "dinner" | "snack" = "lunch",
  count: number = 3
): Promise<RecipeSuggestion[]> {
  const prompt = `
You are a nutritionist AI for a family care app, specialising in meals for elders and health-conscious families.

Patient health conditions: ${healthConditions.join(", ") || "none specified"}
Dietary restrictions: ${dietaryRestrictions.join(", ") || "none"}
Available ingredients: ${availableIngredients.join(", ") || "common pantry items"}
Meal type: ${mealType}

Suggest ${count} healthy, easy-to-prepare recipes that are:
- Safe for the listed health conditions
- Free from restricted ingredients
- Nutritious and easy to digest

Return ONLY valid JSON — an array of ${count} recipe objects:
[
  {
    "recipeName": "recipe name",
    "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "nutritionBenefits": "Brief explanation of health benefits",
    "suitableFor": ["condition1", "condition2"],
    "prepTime": "e.g. 20 minutes"
  }
]
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<RecipeSuggestion[]>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 6. MEDICINE INTERACTION CHECKER
//    Input: list of medicine names
//    Output: interaction analysis + recommendations
// ═══════════════════════════════════════════════════════════════

export async function checkMedicineInteractions(
  medicines: string[],
  patientAge?: number,
  conditions?: string[]
): Promise<MedicineInteractionResult> {
  const prompt = `
You are a clinical pharmacology AI assistant for a family care app.
Check for dangerous interactions between these medicines:
${medicines.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Patient age: ${patientAge ?? "not specified"}
Known conditions: ${conditions?.join(", ") ?? "not specified"}

Analyze:
- Drug-drug interactions
- Age-related concerns
- Condition-related contraindications

Return ONLY valid JSON:
{
  "safe": <true if no significant interactions found>,
  "interactions": [
    {
      "medicines": ["medicine A", "medicine B"],
      "risk": "low|medium|high",
      "description": "What can happen and why it's risky"
    }
  ],
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ],
  "consultDoctor": <true if any interaction is medium or high risk>
}

IMPORTANT: This is an informational tool only. Always recommend consulting a doctor for medical decisions.
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<MedicineInteractionResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 7. PERSONALISED SLEEP STORY
//    Input: user preferences, mood, name
//    Output: a short calming bedtime story
// ═══════════════════════════════════════════════════════════════

export async function generateSleepStory(
  userName: string,
  mood: string,
  preferences: {
    theme?: string;     // e.g. "nature", "fantasy", "childhood memories"
    length?: "short" | "medium" | "long";
    language?: string;
  } = {}
): Promise<SleepStoryResult> {
  const { theme = "nature", length = "medium", language = "English" } = preferences;

  const wordCount = length === "short" ? 150 : length === "medium" ? 300 : 500;

  const prompt = `
You are a gentle sleep story narrator for a family care app, helping elders and family members relax at bedtime.

Create a personalised, calming bedtime story for ${userName}.
Their current mood is: ${mood}
Preferred theme: ${theme}
Language: ${language}
Target length: approximately ${wordCount} words

Requirements:
- Warm, slow-paced, and deeply relaxing
- No conflict, danger, or excitement
- Include gentle sensory details (sounds, smells, soft textures)
- Mention ${userName} by name naturally in the story
- End with drifting off to peaceful sleep

Return ONLY valid JSON:
{
  "title": "Story title",
  "story": "The full story text here...",
  "duration": "Estimated read time e.g. '3 minutes'",
  "theme": "${theme}"
}
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<SleepStoryResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 8. EMOTION TREND FORECASTER
//    Input: array of past mood entries (last 7–30 days)
//    Output: trend analysis + personalised recommendations
// ═══════════════════════════════════════════════════════════════

export async function forecastEmotionTrend(
  moodHistory: Array<{
    date: string;
    emotion: string;
    moodScore: number;  // 1–10
    notes?: string;
  }>,
  userName: string = "the user",
  userRole: string = "elder"
): Promise<EmotionTrendForecast> {
  const historyText = moodHistory
    .map(
      (m) =>
        `${m.date}: ${m.emotion} (score: ${m.moodScore}/10)${m.notes ? " — " + m.notes : ""}`
    )
    .join("\n");

  const prompt = `
You are an empathetic AI mental wellness analyst for a family care app.
Analyse the mood history of ${userName} (${userRole}) over the past period:

${historyText}

Based on this data:
- Identify the overall emotional trend
- Find recurring triggers or patterns
- Provide actionable, caring recommendations

Return ONLY valid JSON:
{
  "trend": "improving|stable|declining",
  "forecast": "A warm 2-3 sentence explanation of the trend and what it means for ${userName}",
  "triggers": ["Possible trigger 1", "Possible trigger 2"],
  "recommendations": [
    "Specific caring recommendation 1",
    "Specific caring recommendation 2",
    "Specific caring recommendation 3"
  ],
  "alertFamily": <true if trend is declining and needs family attention>
}
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<EmotionTrendForecast>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 9. AI MEMORY COMPANION
//    Input: user's message + their stored memories/stories
//    Output: warm conversational reply using their memories
// ═══════════════════════════════════════════════════════════════

export async function aiMemoryCompanion(
  userMessage: string,
  userName: string,
  storedMemories: Array<{
    title: string;
    content: string;
    date?: string;
    tags?: string[];
  }>
): Promise<MemoryCompanionResult> {
  const memoriesText =
    storedMemories.length > 0
      ? storedMemories
          .slice(0, 10) // use up to 10 most recent memories
          .map(
            (m, i) =>
              `Memory ${i + 1} [${m.date ?? "unknown date"}]: "${m.title}" — ${m.content}`
          )
          .join("\n")
      : "No stored memories yet.";

  const prompt = `
You are a compassionate AI Memory Companion for a family care app.
You help ${userName} reminisce, feel connected, and share their life stories.
You speak warmly, like a dear friend who remembers everything they've shared.

${userName}'s stored memories and stories:
${memoriesText}

${userName} just said: "${userMessage}"

Respond as their caring Memory Companion:
- If they reference a past memory, acknowledge and expand on it warmly
- If it's a new topic, respond with empathy and curiosity
- Keep the conversation going gently
- Be warm, patient, and never condescending

Return ONLY valid JSON:
{
  "response": "Your warm conversational reply to ${userName} (2-4 sentences)",
  "memoriesReferenced": ["title of memory used (if any)"],
  "newTopics": ["new topic detected from this message"],
  "emotionalTone": "e.g. nostalgic, happy, reflective, curious"
}
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<MemoryCompanionResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 10. SMART CHATBOT
//     Input: user message + conversation history
//     Output: helpful reply + intent classification
// ═══════════════════════════════════════════════════════════════

export async function smartChatbot(
  userMessage: string,
  userName: string,
  userRole: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<ChatbotResult> {
  const historyText =
    conversationHistory.length > 0
      ? conversationHistory
          .slice(-6) // last 6 exchanges for context
          .map((m) => `${m.role === "user" ? userName : "Assistant"}: ${m.content}`)
          .join("\n")
      : "";

  const prompt = `
You are a helpful, warm AI assistant in the "AI Powered Family Connect" app.
You assist ${userName} (${userRole}) with health questions, medicine reminders, family coordination, and emotional support.

${historyText ? `Recent conversation:\n${historyText}\n` : ""}
${userName} just asked: "${userMessage}"

Your role: be helpful, caring, and safe. For medical emergencies, always say to call emergency services.
For questions outside your scope, say so honestly and suggest contacting family or a doctor.

Return ONLY valid JSON:
{
  "reply": "Your helpful, warm response (2-4 sentences)",
  "intent": "one of: medicine_query|health_question|emotional_support|family_coordination|reminder|emergency|general_chat|unknown",
  "suggestedActions": ["Suggested action button 1", "Suggested action button 2"],
  "escalateToHuman": <true if the situation needs a real family member or doctor>
}
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<ChatbotResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// 11. MOOD COMPASS
//     Input: how the user is feeling right now (text description)
//     Output: mood score + personalised activity recommendations
// ═══════════════════════════════════════════════════════════════

export async function getMoodCompassSuggestions(
  feelingDescription: string,
  userName: string,
  userRole: string = "elder",
  timeOfDay: "morning" | "afternoon" | "evening" | "night" = "afternoon"
): Promise<MoodCompassResult> {
  const prompt = `
You are a mindful wellness AI coach in a family care app.
${userName} (${userRole}) described their current feeling as: "${feelingDescription}"
Time of day: ${timeOfDay}

Based on this, provide personalised mood support and activity suggestions.

Activities should be:
- Age-appropriate and safe for a ${userRole}
- Achievable alone or with family
- Suited to the ${timeOfDay}

Return ONLY valid JSON:
{
  "currentMood": "One-word mood label (e.g. melancholic, peaceful, restless, joyful)",
  "moodScore": <number 1-10, where 1=very low, 10=very high>,
  "activities": [
    "Specific activity 1 with brief instruction",
    "Specific activity 2 with brief instruction",
    "Specific activity 3 with brief instruction"
  ],
  "affirmation": "A warm, personalised affirmation for ${userName} (1 sentence)",
  "breathingExercise": "Optional: a simple breathing exercise if mood is anxious/stressed (or null)"
}
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJSON<MoodCompassResult>(raw);
}

// ─── Refill Guardian helper (used in medicine feature) ────────

export async function generateRefillReminder(
  medicineName: string,
  daysLeft: number,
  userName: string
): Promise<GeminiTextResponse> {
  const prompt = `
Generate a warm, friendly medicine refill reminder message for ${userName}.
Medicine: ${medicineName}
Days of supply remaining: ${daysLeft}

Write 2 sentences max. Be caring but clear about urgency.
Do not use medical jargon. Output plain text only (no JSON, no formatting).
`.trim();

  const result = await callGemini(prompt);
  return { success: true, result };
}
