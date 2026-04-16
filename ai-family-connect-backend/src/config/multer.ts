/**
 * config/multer.ts
 * Centralised Multer upload configuration for all upload features.
 */

import multer, { FileFilterCallback, StorageEngine } from "multer";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";

function ensureDir(relativePath: string): string {
  const absolute = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolute)) {
    fs.mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}

const UPLOAD_BASE = "uploads";

const DIRS = {
  mood: ensureDir(`${UPLOAD_BASE}/mood`),
  injury: ensureDir(`${UPLOAD_BASE}/injury`),
  doctor: ensureDir(`${UPLOAD_BASE}/doctor-slips`),
  chat: ensureDir(`${UPLOAD_BASE}/chat`),
  avatar: ensureDir(`${UPLOAD_BASE}/avatars`),
} as const;

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
const CHAT_MIMES = new Set([...IMAGE_MIMES, "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"]);

const MB = 1024 * 1024;

const LIMITS = {
  mood: 5 * MB,
  injury: 10 * MB,
  doctor: 10 * MB,
  chat: 15 * MB,
  avatar: 3 * MB,
} as const;

function makeFilename(prefix: string, file: Express.Multer.File): string {
  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
  };
  const ext = mimeMap[file.mimetype] || ".bin";
  return `${prefix}-${uuidv4()}${ext}`;
}

function makeDiskStorage(dir: string, prefix: string): StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => cb(null, makeFilename(prefix, file)),
  });
}

function makeFileFilter(allowedMimes: Set<string>) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed.`));
    }
  };
}

export const moodPhotoUpload = multer({
  storage: makeDiskStorage(DIRS.mood, "mood"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits: { fileSize: LIMITS.mood },
});

export const injuryPhotoUpload = multer({
  storage: makeDiskStorage(DIRS.injury, "injury"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits: { fileSize: LIMITS.injury },
});

export const doctorSlipUpload = multer({
  storage: makeDiskStorage(DIRS.doctor, "slip"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits: { fileSize: LIMITS.doctor },
});

export const chatMediaUpload = multer({
  storage: makeDiskStorage(DIRS.chat, "chat"),
  fileFilter: makeFileFilter(CHAT_MIMES),
  limits: { fileSize: LIMITS.chat },
});

export const avatarUpload = multer({
  storage: makeDiskStorage(DIRS.avatar, "avatar"),
  fileFilter: makeFileFilter(IMAGE_MIMES),
  limits: { fileSize: LIMITS.avatar },
});

export function deleteUploadedFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`[Multer] Failed to delete uploaded file at ${filePath}:`, err);
  }
}

export function buildFileUrl(filePath: string, baseUrl: string): string {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return `${baseUrl}/${relative}`;
}