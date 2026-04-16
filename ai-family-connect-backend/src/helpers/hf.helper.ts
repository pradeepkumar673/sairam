import axios from "axios";
import { 
  MoodMirrorResult, 
  VoiceEmotionResult, 
  DoctorSlipResult 
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
