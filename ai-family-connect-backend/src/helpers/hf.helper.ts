import axios from "axios";
import { 
  MoodMirrorResult, 
  VoiceEmotionResult, 
  DoctorSlipResult,
  InjuryAnalysisResult,
  RecipeSuggestion,
  SleepStoryResult
} from "./gemini.helper";

const HF_API_URL = "https://api-inference.huggingface.co/models";

const getHFHeaders = () => {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) throw new Error("HUGGINGFACE_TOKEN is not configured.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

/**
 * Mood Mirror via Hugging Face
 * Model: dima806/facial_emotions_image_detection
 */
export async function analyzeFacialMoodHF(
  imageBase64: string,
  userName: string,
  userRole: string
): Promise<MoodMirrorResult> {
  const modelId = "dima806/facial_emotions_image_detection";
  
  // Convert base64 to binary buffer
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const binaryBuffer = Buffer.from(base64Data, "base64");

  const response = await axios.post(
    `${HF_API_URL}/${modelId}`,
    binaryBuffer,
    {
      headers: {
        ...getHFHeaders(),
        "Content-Type": "application/octet-stream",
      },
      timeout: 10000, // 10s timeout to allow Gemini fallback on cold start
    }
  );

  const results = response.data;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("Invalid response from Hugging Face");
  }

  // Example HF format: [{ label: 'happy', score: 0.95 }, ...]
  const topEmotion = results[0];
  const emotionLabel = topEmotion.label.toLowerCase();
  
  const subEmotions = results.slice(1, 3).map((r: any) => r.label);

  const alertFamily = ["sad", "fear", "angry", "disgust"].includes(emotionLabel) && topEmotion.score > 0.7;

  return {
    emotion: emotionLabel,
    confidence: Math.round(topEmotion.score * 100),
    subEmotions,
    suggestion: `We noticed you're feeling a bit ${emotionLabel}, ${userName}. Take a deep breath and know your family is here.`,
    alertFamily,
  };
}

/**
 * Voice Emotion Classification via Hugging Face
 * Model: j-hartmann/emotion-english-distilroberta-base
 */
export async function analyzeVoiceEmotionHF(
  transcribedText: string,
  userName: string,
  userRole: string
): Promise<VoiceEmotionResult> {
  const modelId = "j-hartmann/emotion-english-distilroberta-base";

  const response = await axios.post(
    `${HF_API_URL}/${modelId}`,
    { inputs: transcribedText },
    {
      headers: getHFHeaders(),
      timeout: 10000,
    }
  );

  // Example format: [[{ label: 'joy', score: 0.9 }, ...]]
  const results = response.data[0];
  if (!results || results.length === 0) {
    throw new Error("Invalid response from Hugging Face");
  }

  // Sort by score
  results.sort((a: any, b: any) => b.score - a.score);
  const primary = results[0].label;

  const stressMap: Record<string, string> = {
    anger: "high", disgust: "medium", fear: "high", 
    joy: "low", neutral: "low", sadness: "medium", surprise: "low"
  };

  return {
    emotion: primary,
    stressLevel: (stressMap[primary] || "medium") as any,
    energyLevel: ["anger", "joy", "surprise", "fear"].includes(primary) ? "high" : "low",
    suggestion: `It sounds like you have some ${primary} in your voice, ${userName}. Keep expressing yourself!`,
    alertFamily: ["fear", "anger"].includes(primary),
  };
}

/**
 * Medical Prescription OCR via Hugging Face Vision API (Llama 3.2 11B Vision)
 * This acts as a powerful open-source drop-in replacement for Google Gemini
 */
export async function scanDoctorSlipHF(imageBase64: string): Promise<DoctorSlipResult> {
  const modelId = "Qwen/Qwen2-VL-7B-Instruct";
  const url = `${HF_API_URL}/${modelId}/v1/chat/completions`;

  // We explicitly define a base64 Data URI for the chat formatting
  const base64Uri = imageBase64.startsWith("data:image") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  const requestBody = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a medical document OCR and analysis AI. Extract all medical information from this doctor's prescription image.
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
}`
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000,
    temperature: 0.2
  };

  const response = await axios.post(url, requestBody, {
    headers: getHFHeaders(),
    timeout: 30000,
  });

  const rawText = response.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("No textual response from Hugging Face Vision");

  const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonString = match ? match[0] : rawText;
  
  return JSON.parse(jsonString) as DoctorSlipResult;
}

/**
 * Wound/Injury Analysis via Hugging Face Vision API (Qwen2-VL)
 */
export async function analyzeInjuryHF(imageBase64: string): Promise<InjuryAnalysisResult> {
  const modelId = "Qwen/Qwen2-VL-7B-Instruct"; // High performance vision model
  const url = `${HF_API_URL}/${modelId}/v1/chat/completions`;

  const requestBody = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a medical first-aid AI assistant for a family safety app. Analyze this injury photo.
Return ONLY valid JSON in this exact format:
{
  "severity": "minor|moderate|severe|critical",
  "possibleInjury": "e.g., bruise, laceration, burn, sprain, fracture",
  "immediateAction": "Most important single action to take RIGHT NOW",
  "requiresDoctor": true,
  "requiresEmergency": false,
  "careInstructions": ["Step 1", "Step 2", "Step 3"]
}
Be conservative; when in doubt, recommend seeing a doctor.`
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 800,
    temperature: 0.1
  };

  const response = await axios.post(url, requestBody, {
    headers: getHFHeaders(),
    timeout: 30000,
  });

  const rawText = response.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("No textual response from HF Vision");

  const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonString = match ? match[0] : rawText;
  
  return JSON.parse(jsonString) as InjuryAnalysisResult;
}

/**
 * Recipe Suggestions via Hugging Face Vision/Text API (Qwen2-VL)
 */
export async function suggestRecipeHF(ingredients: string[], restrictions?: string[], mood?: string): Promise<RecipeSuggestion[]> {
  const modelId = "Qwen/Qwen2-VL-7B-Instruct";
  const url = `${HF_API_URL}/${modelId}/v1/chat/completions`;

  const requestBody = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a nutritionist AI. Suggest 3 healthy, easy recipes using: ${ingredients.join(", ")}.
Dietary restrictions: ${restrictions?.join(", ") || "none"}. Mood context: ${mood || "neutral"}.

Return ONLY valid JSON array:
[
  {
    "recipeName": "...",
    "ingredients": ["item with quantity", ...],
    "instructions": ["Step 1", "Step 2", ...],
    "nutritionBenefits": "...",
    "suitableFor": ["condition1", ...],
    "prepTime": "e.g., 20 minutes"
  }
]`
          }
        ]
      }
    ],
    max_tokens: 1500,
    temperature: 0.2
  };

  const response = await axios.post(url, requestBody, {
    headers: getHFHeaders(),
    timeout: 30000,
  });

  const rawText = response.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("No textual response from HF Recipes");

  const match = rawText.match(/\[[\s\S]*\]/);
  const jsonString = match ? match[0] : rawText;
  
  return JSON.parse(jsonString) as RecipeSuggestion[];
}

/**
 * Sleep Story Generation via Hugging Face Vision/Text API (Qwen2-VL)
 */
export async function generateSleepStoryHF(userName: string, mood?: string, preferences?: any): Promise<SleepStoryResult> {
  const modelId = "Qwen/Qwen2-VL-7B-Instruct"; // High capacity for creative writing
  const url = `${HF_API_URL}/${modelId}/v1/chat/completions`;

  const theme = preferences?.theme || "nature";
  const length = preferences?.length || "medium";
  const words = length === "short" ? 150 : length === "long" ? 500 : 300;

  const requestBody = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a professional bedtime story narrator for elderly people. Write a calming, gentle, and immersive sleep story for ${userName}.
Theme: ${theme}
Approximate length: ${words} words.
Mood context: ${mood || "neutral"}.

Return ONLY valid JSON in this exact format:
{
  "title": "Soothing title of the story",
  "story": "The full story text...",
  "duration": "e.g., 5 min read",
  "theme": "${theme}"
}`
          }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  };

  const response = await axios.post(url, requestBody, {
    headers: getHFHeaders(),
    timeout: 45000,
  });

  const rawText = response.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("No textual response from HF Sleep Stories");

  const match = rawText.match(/\{[\s\S]*\}/);
  const jsonString = match ? match[0] : rawText;
  
  return JSON.parse(jsonString) as SleepStoryResult;
}



