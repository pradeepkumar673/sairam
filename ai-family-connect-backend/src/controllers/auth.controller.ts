import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";

// ─────────────────────────────────────────────
// Helper: Generate signed JWT for a user
// ─────────────────────────────────────────────
const generateToken = (id: string, role: string, email: string): string => {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// ─────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone, dateOfBirth } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, message: "Name, email, password, and role are required." });
      return;
    }

    // Validate role
    const validRoles = ["elder", "student", "family"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(", ")}` });
      return;
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ success: false, message: "An account with this email already exists." });
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate a unique invite code for family linking
    const inviteCode = crypto.randomBytes(5).toString("hex").toUpperCase(); // e.g. "A3F9C2"

    // Create the new user
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      inviteCode,
    });

    // Generate JWT
    const token = generateToken(newUser._id.toString(), newUser.role, newUser.email);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        inviteCode: newUser.inviteCode,
      },
    });
  } catch (error: any) {
    console.error("[AUTH] Register error:", error.message);
    res.status(500).json({ success: false, message: "Server error during registration." });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login an existing user
// @access  Public
// ─────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required." });
      return;
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT
    const token = generateToken(user._id.toString(), user.role, user.email);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        inviteCode: user.inviteCode,
        profilePhoto: user.profilePhoto || null,
      },
    });
  } catch (error: any) {
    console.error("[AUTH] Login error:", error.message);
    res.status(500).json({ success: false, message: "Server error during login." });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get the currently authenticated user's profile
// @access  Private
// ─────────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error("[AUTH] GetMe error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/auth/update-profile
// @desc    Update name, phone, dateOfBirth, profilePhoto
// @access  Private
// ─────────────────────────────────────────────
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, dateOfBirth, profilePhoto } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.id,
      { name, phone, dateOfBirth, profilePhoto },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[AUTH] UpdateProfile error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/auth/change-password
// @desc    Change the user's password
// @access  Private
// ─────────────────────────────────────────────
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: "Both current and new password are required." });
      return;
    }

    const user = await User.findById(req.user?.id).select("+password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Current password is incorrect." });
      return;
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (error: any) {
    console.error("[AUTH] ChangePassword error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
