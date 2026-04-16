/**
 * config/multer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised Multer upload configuration for all AI-powered upload features.
 *
 * Five upload instances, each with its own directory:
 *   1. moodPhotoUpload    — Facial Mood Mirror (Feature 8)
 *   2. injuryPhotoUpload  — Injury Photo Analyzer (Feature 2)
 *   3. doctorSlipUpload   — Doctor Slip Scanner (Feature 5)
 *   4. chatMediaUpload    — Family Chat media (Feature 19: images + voice)
 *   5. avatarUpload       — User profile avatar
 *
 * All instances:
 *   - Use disk storage (files are read → base64 → Gemini; NOT stored long-term).
 *   - Enforce MIME type allow-lists.
 *   - Enforce per-file size limits.
 *   - Generate unique, sanitised filenames (uuid + original extension).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import multer, { FileFilterCallback, StorageEngine } from "multer";
import * as path from "path";
import * as fs   from "fs";
import { v4 as uuidv4 } from "uuid";
import { Request }       from "express";

// ─── Directory Setup ──────────────────────────────────────────────────────────

/**
 * Resolve a path relative to the project root and ensure it exists.
 * Multer will fail silently if the destination directory is missing.
 */
function ensureDir(relativePath: string): string {
  const absolute = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolute)) {
    fs.mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}

/** Upload base directory — change to a CDN mount point in production */
const UPLOAD_BASE = "uploads";

const DIRS = {
  mood:      ensureDir(`${UPLOAD_BASE}/mood`),
  injury:    ensureDir(`${UPLOAD_BASE}/injury`),
  doctor:    ensureDir(`${UPLOAD_BASE}/doctor-slips`),
  chat:      ensureDir(`${UPLOAD_BASE}/chat`),
  avatar:    ensureDir(`${UPLOAD_BASE}/avatars`),
} as const;

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const IMAGE_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** Chat media allows images AND voice recordings */
const CHAT_MIMES: ReadonlySet<string> = new Set([
  ...IMAGE_MIMES,
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

// ─── Size Limits ──────────────────────────────────────────────────────────────

const MB = 1024 * 1024; // 1 megabyte in bytes

const LIMITS = {
  mood:    5  * MB,   // Selfie / mood photo
  injury:  10 * MB,   // May include high-res injury images
  doctor:  10 * MB,   // Prescription scan — may be a PDF-quality photo
  chat:    15 * MB,   // Chat image or voice memo
  avatar:  3  * MB,   // Profile picture — always small
} as const;

// ─── Filename Generator ───────────────────────────────────────────────────────

/**
 * Produce a unique, sanitised filename.
 * Pattern: `{folder-prefix}-{uuid}{originalExtension}`
 * e.g.  `mood-3f2c1a44-...jpeg`
 */
function makeFilename(prefix: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  return `${prefix}-${uuidv4()}${ext}`;
}

// ─── Storage Factory ──────────────────────────────────────────────────────────

function makeDiskStorage(dir: string, prefix: string): StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename:    (_req, file, cb) => cb(null, makeFilename(prefix, file.originalname)),
  });
}

// ─── File Filter Factory ──────────────────────────────────────────────────────

function makeFileFilter(
  allowedMimes: ReadonlySet<string>
): (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void {
  return (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type "${file.mimetype}" is not allowed. ` +
          `Accepted types: ${[...allowedMimes].join(", ")}`
        )
      );
    }
  };
}

// ─── Export: Named Upload Instances ──────────────────────────────────────────

/**
 * 1. MOOD PHOTO — Facial Mood Mirror (Feature 8)
 *    Single image upload. Accepted in /api/ai/mood-mirror
 */
export const moodPhotoUpload = multer({
  storage:    makeDiskStorage(DIRS.mood, "mood"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits:     { fileSize: LIMITS.mood },
});

/**
 * 2. INJURY PHOTO — Injury Photo Analyzer (Feature 2)
 *    Single image upload. Accepted in /api/ai/analyze-injury
 */
export const injuryPhotoUpload = multer({
  storage:    makeDiskStorage(DIRS.injury, "injury"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits:     { fileSize: LIMITS.injury },
});

/**
 * 3. DOCTOR SLIP — Doctor Slip Scanner (Feature 5)
 *    Single image upload. Accepted in /api/ai/scan-doctor-slip
 */
export const doctorSlipUpload = multer({
  storage:    makeDiskStorage(DIRS.doctor, "slip"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits:     { fileSize: LIMITS.doctor },
});

/**
 * 4. CHAT MEDIA — Family Chat (Feature 19)
 *    Accepts images and voice recordings.
 *    Accepted in /api/chat/send (when messageType !== "text")
 */
export const chatMediaUpload = multer({
  storage:    makeDiskStorage(DIRS.chat, "chat"),
  fileFilter: makeFileFilter(CHAT_MIMES),
  limits:     { fileSize: LIMITS.chat },
});

/**
 * 5. AVATAR — User profile photo
 *    Single image upload. Accepted in /api/auth/update-profile
 */
export const avatarUpload = multer({
  storage:    makeDiskStorage(DIRS.avatar, "avatar"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits:     { fileSize: LIMITS.avatar },
});

// ─── Helpers (used by controllers after upload) ───────────────────────────────

/**
 * Delete an uploaded file from disk.
 * Call this after sending the file to Gemini — we don't need local copies.
 */
export function deleteUploadedFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Non-fatal — log but do not crash the request
    console.error(`[Multer] Failed to delete uploaded file at ${filePath}:`, err);
  }
}

/**
 * Build the public URL for a file that should be served statically.
 * Used for chat media / avatar (files we DO keep on disk).
 *
 * @param filePath  Absolute path saved by Multer
 * @param baseUrl   e.g. process.env.API_BASE_URL || "http://localhost:5000"
 */
export function buildFileUrl(filePath: string, baseUrl: string): string {
  // Convert absolute path to a path relative to process.cwd()
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return `${baseUrl}/${relative}`;
}
