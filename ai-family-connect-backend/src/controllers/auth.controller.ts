import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";

const generateToken = (id: string, role: string, email: string): string => {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, phone, dateOfBirth } = req.body;

  if (!name || !email || !password || !role) {
    throw new AppError("Name, email, password, and role are required.", 400);
  }

  const validRoles = ["elder", "student", "family"];
  if (!validRoles.includes(role)) {
    throw new AppError(`Role must be one of: ${validRoles.join(", ")}`, 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const inviteCode = crypto.randomBytes(5).toString("hex").toUpperCase();

  const nameParts = name.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "Family";

  const newUser = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    phone: phone || null,
    dateOfBirth: dateOfBirth || null,
    inviteCode,
  });

  const token = generateToken(newUser._id.toString(), newUser.role, newUser.email);

  res.status(201).json(new ApiResponse(201, {
    token,
    user: {
      id: newUser._id,
      name: newUser.fullName(),
      email: newUser.email,
      role: newUser.role,
      inviteCode: newUser.inviteCode,
    },
  }, "Account created successfully."));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id.toString(), user.role, user.email);

  res.status(200).json(new ApiResponse(200, {
    token,
    user: {
      id: user._id,
      name: user.fullName(),
      email: user.email,
      role: user.role,
      inviteCode: user.inviteCode,
      avatar: user.avatar || null,
    },
  }, "Login successful."));
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id).select("-password");
  if (!user) throw new AppError("User not found.", 404);
  res.status(200).json(new ApiResponse(200, { user }));
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, phone, dateOfBirth, avatar } = req.body;
  const update: any = {};
  if (name) {
    const [firstName, ...last] = name.split(" ");
    update.firstName = firstName;
    update.lastName = last.join(" ");
  }
  if (phone) update.phone = phone;
  if (dateOfBirth) update.dateOfBirth = dateOfBirth;
  if (avatar) update.avatar = avatar;

  const updatedUser = await User.findByIdAndUpdate(req.user?.id, update, { new: true, runValidators: true }).select("-password");
  if (!updatedUser) throw new AppError("User not found.", 404);
  res.status(200).json(new ApiResponse(200, { user: updatedUser }, "Profile updated."));
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError("Current and new password are required.", 400);
  }

  const user = await User.findById(req.user?.id).select("+password");
  if (!user) throw new AppError("User not found.", 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError("Current password is incorrect.", 401);

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, null, "Password changed successfully."));
});