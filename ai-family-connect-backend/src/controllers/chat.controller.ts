/**
 * controllers/chat.controller.ts
 * REST handlers for chat history, media upload, unread counts
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import ChatMessage from "../models/ChatMessage";
import { FamilyLink } from "../models/FamilyLink";
import path from "path";

// ── Helpers ────────────────────────────────────────────────────────
const assertFamilyMember = async (userId: string, familyId: string) => {
  const link = await FamilyLink.findOne({ userId, familyId, status: "accepted" });
  if (!link) throw new AppError("You are not a member of this family group.", 403);
};

// ── GET /api/chat/:familyId/history ───────────────────────────────
export const getFamilyChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const { familyId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const before = req.query.before as string | undefined; // cursor-based pagination

  await assertFamilyMember(userId, familyId);

  const query: any = { familyId, isDeleted: false };
  if (before) {
    // Get messages older than the given message ID (cursor pagination)
    const pivot = await ChatMessage.findById(before).select("createdAt");
    if (pivot) query.createdAt = { $lt: pivot.createdAt };
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(before ? 0 : (page - 1) * limit)
    .populate("senderId", "name avatar role")
    .lean();

  const total = await ChatMessage.countDocuments({ familyId, isDeleted: false });

  res.status(200).json(
    new ApiResponse(200, {
      messages: messages.reverse(), // oldest first
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  );
});

// ── GET /api/chat/:familyId/unread ────────────────────────────────
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const { familyId } = req.params;

  await assertFamilyMember(userId, familyId);

  const count = await ChatMessage.countDocuments({
    familyId,
    isDeleted: false,
    readBy: { $ne: userId },
    senderId: { $ne: userId }, // don't count own messages
  });

  res.status(200).json(new ApiResponse(200, { unreadCount: count }));
});

// ── POST /api/chat/:familyId/media ────────────────────────────────
export const uploadChatMedia = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const { familyId } = req.params;

  await assertFamilyMember(userId, familyId);

  if (!req.file) throw new AppError("No media file uploaded.", 400);

  const fileUrl = `/uploads/${req.file.filename}`;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const mediaType = [".mp3", ".wav", ".ogg", ".m4a"].includes(ext) ? "voice" : "image";

  res.status(200).json(
    new ApiResponse(200, { url: fileUrl, mediaType }, "Media uploaded successfully.")
  );
});

// ── DELETE /api/chat/message/:messageId ───────────────────────────
export const deleteChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const { messageId } = req.params;

  const message = await ChatMessage.findById(messageId);
  if (!message) throw new AppError("Message not found.", 404);

  if (message.senderId.toString() !== userId) {
    throw new AppError("You can only delete your own messages.", 403);
  }

  // Soft delete
  message.isDeleted = true;
  message.content = "This message was deleted.";
  await message.save();

  res.status(200).json(new ApiResponse(200, { messageId }, "Message deleted."));
});
