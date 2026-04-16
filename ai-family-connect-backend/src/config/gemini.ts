/**
 * config/gemini.ts
 * Gemini 1.5 Flash API configuration and base client.
 * Handles text and vision prompts, base64 conversion, and JSON parsing.
 */

import axios, { AxiosError } from "axios";
import * as fs from "fs";
import * as path from "path";

export const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export const GEMINI_DEFAULT_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 1024,
} as const;

export const GEMINI_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
] as const;

export type GeminiImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "image/heic"
  | "image/heif";

export interface GeminiCallOptions {
  prompt: string;
  imageBase64?: string;
  imageMimeType?: GeminiImageMimeType;
  generationConfig?: Partial<typeof GEMINI_DEFAULT_CONFIG>;
}

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("[Gemini] GEMINI_API_KEY is not configured.");

  const { prompt, imageBase64, imageMimeType = "image/jpeg", generationConfig } = options;

  const parts: any[] = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: { ...GEMINI_DEFAULT_CONFIG, ...generationConfig },
    safetySettings: GEMINI_SAFETY_SETTINGS,
  };

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      requestBody,
      { headers: { "Content-Type": "application/json" }, timeout: 30_000 }
    );

    const text: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text.trim()) throw new Error("[Gemini] Received an empty response from the API.");
    return text.trim();
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message ?? err.message;
      throw new Error(`[Gemini] API request failed (HTTP ${status}): ${message}`);
    }
    throw err;
  }
}

export function imageFileToBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`[Gemini] Image file not found at path: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath).toString("base64");
}

export function getMimeType(filename: string): GeminiImageMimeType {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, GeminiImageMimeType> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };
  return mimeMap[ext] ?? "image/jpeg";
}

export function stripGeminiMarkdown(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : raw.trim();
}

export function parseGeminiJSON<T>(raw: string): T {
  const cleaned = stripGeminiMarkdown(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `[Gemini] Failed to parse JSON response. Raw text (first 200 chars):\n${cleaned.slice(0, 200)}`
    );
  }
}