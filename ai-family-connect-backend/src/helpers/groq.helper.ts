/**
 * helpers/groq.helper.ts
 * Groq AI helper with robust prompts and Llama 3.2 Vision support.
 */

import { callGroq, parseGroqJSON } from "../config/groq";
import { 
  MoodMirrorResult, 
  DoctorSlipResult, 
  RecipeSuggestion,
  InjuryAnalysisResult,
  SleepStoryResult
} from "./gemini.helper";

/**
 * Mood Mirror via Groq Vision
 */
export async function analyzeFacialMoodGroq(
  imageBase64: string,
  userName: string = "the user",
  userRole: string = "elder"
): Promise<MoodMirrorResult> {
  const prompt = `Analyze the facial expression in this image and detect the emotional state of ${userName} (${userRole}).
Return ONLY valid JSON:
{
  "emotion": "primary emotion",
  "confidence": number 0-100,
  "subEmotions": ["emotion1", "emotion2"],
  "suggestion": "A warm, caring 1-2 sentence message.",
  "alertFamily": true/false
}`;

  const raw = await callGroq({
    model: "llama-3.2-90b-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }
    ]
  });

  return parseGroqJSON<MoodMirrorResult>(raw);
}

/**
 * Prescription Scanning via Groq Vision
 */
export async function scanDoctorSlipGroq(imageBase64: string): Promise<DoctorSlipResult> {
  const prompt = `Extract medical info from this prescription. Return ONLY valid JSON:
{
  "medicines": [{"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}],
  "diagnosis": "...",
  "doctorName": "...",
  "date": "...",
  "warnings": ["..."]
}`;

  const raw = await callGroq({
    model: "llama-3.2-90b-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }
    ]
  });

  return parseGroqJSON<DoctorSlipResult>(raw);
}

/**
 * Recipe Suggestions via Groq (Text-only or Vision)
 */
export async function suggestRecipeGroq(ingredients: string[], restrictions?: string[], mood?: string): Promise<RecipeSuggestion[]> {
  const prompt = `Suggest 3 healthy recipes using: ${ingredients.join(", ")}.
Dietary restrictions: ${restrictions?.join(", ") || "none"}.
Mood context: ${mood || "neutral"}.
Return ONLY valid JSON array:
[{"recipeName": "...", "ingredients": ["..."], "instructions": ["..."], "nutritionBenefits": "...", "suitableFor": ["..."], "prepTime": "..."}]`;

  const raw = await callGroq({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }]
  });

  return parseGroqJSON<RecipeSuggestion[]>(raw);
}

/**
 * Injury Analysis via Groq Vision
 */
export async function analyzeInjuryGroq(imageBase64: string): Promise<InjuryAnalysisResult> {
  const prompt = `Analyze this injury photo. Return ONLY valid JSON:
{
  "severity": "minor|moderate|severe|critical",
  "possibleInjury": "...",
  "immediateAction": "...",
  "requiresDoctor": true/false,
  "requiresEmergency": true/false,
  "careInstructions": ["..."]
}`;

  const raw = await callGroq({
    model: "llama-3.2-90b-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }
    ]
  });

  return parseGroqJSON<InjuryAnalysisResult>(raw);
}

/**
 * Saathi Companion Chat via Groq
 */
export async function chatWithCompanionGroq(message: string, history: any[], user: any): Promise<any> {
  const systemPrompt = `You are a warm, caring AI companion named "Saathi" for a family care app.
User is ${user.firstName}, a ${user.role}.
Respond in JSON:
{
  "reply": "warm response",
  "intent": "...",
  "suggestedActions": ["..."],
  "escalateToHuman": true/false
}`;

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  history.slice(-6).forEach(h => {
    messages.push({ role: h.role, content: h.content });
  });
  messages.push({ role: "user", content: message });

  const raw = await callGroq({
    model: "llama-3.3-70b-versatile",
    messages
  });

  return parseGroqJSON(raw);
}
