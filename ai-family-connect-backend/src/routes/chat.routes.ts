/**
 * routes/chat.routes.ts
 * REST endpoints for chat history (real-time handled by Socket.io)
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  getFamilyChatHistory,
  deleteChatMessage,
  getUnreadCount,
  uploadChatMedia,
} from "../controllers/chat.controller";
import { chatMediaUpload } from "../config/multer";

const router = Router();

// All chat routes require authentication
router.use(protect);

/**
 * @route   GET /api/chat/:familyId/history
 * @desc    Get paginated chat history for a family group
 * @query   ?page=1&limit=30&before=<messageId>
 */
router.get("/:familyId/history", getFamilyChatHistory);

/**
 * @route   GET /api/chat/:familyId/unread
 * @desc    Get unread message count for logged-in user
 */
router.get("/:familyId/unread", getUnreadCount);

/**
 * @route   POST /api/chat/:familyId/media
 * @desc    Upload image/voice note for chat (returns URL for socket payload)
 */
router.post(
  "/:familyId/media",
  chatMediaUpload.single("media"),
  uploadChatMedia
);

/**
 * @route   DELETE /api/chat/message/:messageId
 * @desc    Delete (soft-delete) a chat message
 */
router.delete("/message/:messageId", deleteChatMessage);

export default router;
