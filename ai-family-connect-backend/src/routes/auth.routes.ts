import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// ─────────────────────────────────────────────
// Public Routes (no auth required)
// ─────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (elder, student, or family member)
 * @body    { name, email, password, role, phone?, dateOfBirth? }
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Login and receive JWT token
 * @body    { email, password }
 */
router.post("/login", login);

// ─────────────────────────────────────────────
// Protected Routes (JWT required)
// ─────────────────────────────────────────────

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user's full profile
 */
router.get("/me", protect, getMe);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile fields (name, phone, photo, etc.)
 * @body    { name?, phone?, dateOfBirth?, profilePhoto? }
 */
router.put("/update-profile", protect, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password (requires current password)
 * @body    { currentPassword, newPassword }
 */
router.put("/change-password", protect, changePassword);

export default router;
