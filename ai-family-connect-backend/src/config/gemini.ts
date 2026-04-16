/**
 * config/gemini.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gemini 1.5 Flash API configuration and base client.
 *
 * This module:
 *   1. Validates GEMINI_API_KEY is present at startup.
 *   2. Exports `callGemini` — the single axios-based REST caller for text and
 *      vision (image) prompts.
 *   3. Exports `imageFileToBase64` helper used by upload-based AI controllers.
 *
 * Feature-specific prompts live in helpers/gemini.helper.ts.
 * Controllers call helpers; they never call this module directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios, { AxiosError } from "axios";
import * as fs from "fs";
import * as path from "path";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Gemini 1.5 Flash REST endpoint (fast, cost-efficient, vision-capable) */
export const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/** Default generation parameters — tuned for health/care application safety */
export const GEMINI_DEFAULT_CONFIG = {
  temperature:     0.7,   // Balanced creativity vs. consistency
  topP:            0.9,
  maxOutputTokens: 1024,  // Sufficient for JSON + prose responses
} as const;

/**
 * Safety settings enforced on every request.
 * BLOCK_MEDIUM_AND_ABOVE keeps medical / emotional content safe.
 */
export const GEMINI_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",  threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT",  threshold: "BLOCK_MEDIUM_AND_ABOVE" },
] as const;

// ─── Startup Validation ───────────────────────────────────────────────────────

/**
 * Call once during server bootstrap (in server.ts) to fail fast
 * if the API key is missing rather than crashing mid-request.
 */
export function validateGeminiConfig(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "[Gemini] GEMINI_API_KEY is not set in environment variables. " +
      "AI features will not work. Add it to your .env file."
    );
  }
  console.info("[Gemini] ✅ API key found — Gemini 1.5 Flash configured.");
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single content part: either plain text or base64-encoded inline image */
type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/** Allowed MIME types for vision uploads */
export type GeminiImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "image/heic"
  | "image/heif";

export interface GeminiCallOptions {
  /** Prompt text — always required */
  prompt: string;
  /** Base64 image data — for vision features (mood photo, injury, doctor slip) */
  imageBase64?: string;
  /** MIME type of the image; defaults to image/jpeg */
  imageMimeType?: GeminiImageMimeType;
  /** Override default generation parameters */
  generationConfig?: Partial<typeof GEMINI_DEFAULT_CONFIG>;
}

// ─── Core Gemini Caller ───────────────────────────────────────────────────────

/**
 * `callGemini` — the single point of entry for ALL Gemini API calls.
 *
 * Supports:
 *  - Text-only prompts (most AI features)
 *  - Vision prompts: text + image (mood mirror, injury analysis, doctor slip)
 *
 * Returns the trimmed text response from the first candidate.
 * Throws an `Error` on API errors or empty responses.
 */
export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[Gemini] GEMINI_API_KEY is not configured.");
  }

  const { prompt, imageBase64, imageMimeType = "image/jpeg", generationConfig } = options;

  // Build content parts — start with the text prompt
  const parts: GeminiPart[] = [{ text: prompt }];

  // Append image part for vision requests (base64 inline data)
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data:     imageBase64,
      },
    });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      ...GEMINI_DEFAULT_CONFIG,
      ...generationConfig,   // Allow per-call overrides
    },
    safetySettings: GEMINI_SAFETY_SETTINGS,
  };

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      requestBody,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30_000,   // 30 s — generous for vision + large prompts
      }
    );

    const text: string =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text.trim()) {
      throw new Error("[Gemini] Received an empty response from the API.");
    }

    return text.trim();
  } catch (err) {
    if (err instanceof AxiosError) {
      const status  = err.response?.status;
      const message = err.response?.data?.error?.message ?? err.message;
      throw new Error(`[Gemini] API request failed (HTTP ${status}): ${message}`);
    }
    throw err;   // Re-throw non-axios errors unchanged
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Convert a local file to a base64 string for Gemini vision requests.
 * Used by controllers after Multer saves the uploaded file to disk.
 *
 * @param filePath  Absolute or relative path to the image file.
 */
export function imageFileToBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`[Gemini] Image file not found at path: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath).toString("base64");
}

/**
 * Detect the MIME type from a file extension.
 * Defaults to image/jpeg for unrecognised extensions.
 */
export function getMimeType(filename: string): GeminiImageMimeType {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, GeminiImageMimeType> = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".gif":  "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };
  return mimeMap[ext] ?? "image/jpeg";
}

/**
 * Helper: strip Gemini's markdown code fence from a JSON response.
 * Gemini sometimes wraps JSON in \`\`\`json ... \`\`\` blocks.
 */
export function stripGeminiMarkdown(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Helper: safely parse JSON from a Gemini response.
 * Strips optional markdown fences before parsing.
 */
export function parseGeminiJSON<T>(raw: string): T {
  const cleaned = stripGeminiMarkdown(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `[Gemini] Failed to parse JSON response. Raw text (first 200 chars):\n${cleaned.slice(0, 200)}`
    );
  }
}
