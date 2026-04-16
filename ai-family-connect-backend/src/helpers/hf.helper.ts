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
 * Medical Prescription OCR via Hugging Face
 * Model: chinmays18/medical-prescription-ocr
 * Note: If this custom model doesn't return structured JSON, 
 * we rely on our controller's try/catch to fallback to Gemini.
 */
export async function scanDoctorSlipHF(imageBase64: string): Promise<DoctorSlipResult> {
  const modelId = "chinmays18/medical-prescription-ocr";
  
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
      timeout: 15000, // OCR models are heavy
    }
  );

  // Ideally, the HF model returns parsed entities. If not, it throws/fails validation
  // and routes gracefully to Gemini inside the controller.
  const data = response.data;
  
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Empty OCR extraction from Hugging Face");
  }

  // Try to parse out fields generically if it returns a text string or minimal JSON
  // If it's a raw string, we throw so Gemini handles context-aware extraction
  if (typeof data === "string" || (Array.isArray(data) && data[0]?.generated_text)) {
    throw new Error("HF returned unstructured text. Flowing to Gemini LLM for structured extraction...");
  }

  // Attempt to map custom HF JSON to our strict interface
  return {
    medicines: data.medicines || [],
    diagnosis: data.diagnosis || null,
    warnings: data.warnings || [],
    doctorName: data.doctorName || null,
    date: data.date || null,
  };
}
