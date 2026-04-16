/**
 * sockets/chat.socket.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time family group chat via Socket.io
 *
 * Events (client → server):
 *   chat:send    — send a message to the family room
 *   chat:read    — mark all unread messages as read
 *   chat:typing  — broadcast typing indicator
 *
 * Events (server → client):
 *   chat:message       — new message broadcast
 *   chat:read_receipt  — read acknowledgement
 *   chat:typing        — typing indicator
 *   chat:error         — error message
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Server as SocketServer, Socket } from "socket.io";
import { Types }   from "mongoose";
import ChatMessage from "../models/ChatMessage";
import FamilyLink  from "../models/FamilyLink";

interface SendMessagePayload {
  familyId: string;
  content:  string;
  messageType?: "text" | "image" | "voice";
  mediaUrl?:    string;
  replyTo?:     string;
}

interface TypingPayload {
  familyId: string;
  isTyping: boolean;
}

export const registerChatSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId as string;

  // ── Send a chat message ───────────────────────────────────────────────────
  socket.on("chat:send", async (payload: SendMessagePayload) => {
    try {
      const { familyId, content, messageType = "text", mediaUrl, replyTo } = payload;

      if (!familyId || !content?.trim()) {
        socket.emit("chat:error", { message: "familyId and content are required." });
        return;
      }

      // Verify sender belongs to this family
      const link = await FamilyLink.findOne({
        familyId:    new Types.ObjectId(familyId),
        linkedUserId: new Types.ObjectId(userId),   // correct field name from FamilyLink model
        status: "accepted",
      });
      if (!link) {
        socket.emit("chat:error", { message: "You are not a member of this family group." });
        return;
      }

      // Persist message — sender is auto-marked as read via readBy
      const message = await ChatMessage.create({
        familyId: new Types.ObjectId(familyId),
        senderId: new Types.ObjectId(userId),
        content:  content.trim(),
        messageType,
        mediaUrl: mediaUrl ?? null,
        replyTo:  replyTo ? new Types.ObjectId(replyTo) : undefined,
        // Auto-mark as read for sender: insert as proper IReadReceipt object
        readBy: [{ userId: new Types.ObjectId(userId), readAt: new Date() }],
      });

      const populated = await message.populate("senderId", "firstName lastName avatar familyNickname role");

      // Broadcast to entire family room
      io.to(`family:${familyId}`).emit("chat:message", {
        _id:         populated._id,
        familyId,
        sender:      populated.senderId,
        content:     populated.content,
        messageType: populated.messageType,
        mediaUrl:    populated.mediaUrl,
        replyTo:     populated.replyTo,
        readBy:      populated.readBy,
        createdAt:   populated.createdAt,
      });
    } catch (err) {
      console.error("chat:send error:", err);
      socket.emit("chat:error", { message: "Failed to send message." });
    }
  });

  // ── Mark messages as read ─────────────────────────────────────────────────
  socket.on("chat:read", async ({ familyId }: { familyId: string }) => {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Push a read receipt object for this user into all unread messages
      await ChatMessage.updateMany(
        {
          familyId:       new Types.ObjectId(familyId),
          isDeleted:      false,
          senderId:       { $ne: userObjectId },
          "readBy.userId": { $ne: userObjectId },
        },
        {
          $addToSet: {
            readBy: { userId: userObjectId, readAt: new Date() },
          },
        }
      );

      // Notify family room that this user has read messages
      socket.to(`family:${familyId}`).emit("chat:read_receipt", {
        userId,
        familyId,
        readAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("chat:read error:", err);
    }
  });

  // ── Typing indicator ──────────────────────────────────────────────────────
  socket.on("chat:typing", ({ familyId, isTyping }: TypingPayload) => {
    socket.to(`family:${familyId}`).emit("chat:typing", {
      userId,
      familyId,
      isTyping,
    });
  });
};
