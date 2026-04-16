import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ─────────────────────────────────────────────
// Ensure upload directories exist at startup
// ─────────────────────────────────────────────
const UPLOAD_DIRS = [
  "uploads/doctor-slips",
  "uploads/injury-photos",
  "uploads/profile-photos",
];

UPLOAD_DIRS.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─────────────────────────────────────────────
// Generic storage factory
// Saves file to a specific subfolder with a timestamp name
// ─────────────────────────────────────────────
const createStorage = (folder: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, `uploads/${folder}`);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(
        file.originalname
      )}`;
      cb(null, uniqueName);
    },
  });

// ─────────────────────────────────────────────
// File filter: only allow images
// ─────────────────────────────────────────────
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|webp|heic/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, webp, heic)."));
  }
};

// ─────────────────────────────────────────────
// Multer instances for each upload type
// ─────────────────────────────────────────────

/** For doctor prescription / slip scans */
export const uploadDoctorSlip = multer({
  storage: createStorage("doctor-slips"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
}).single("slipImage");

/** For injury photos */
export const uploadInjuryPhoto = multer({
  storage: createStorage("injury-photos"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
}).single("injuryImage");

/** For profile photos */
export const uploadProfilePhoto = multer({
  storage: createStorage("profile-photos"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
}).single("profilePhoto");
