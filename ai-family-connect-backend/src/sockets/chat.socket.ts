/**
 * sockets/chat.socket.ts
 * Real-time family group chat via Socket.io
 */

import { Server as SocketServer, Socket } from "socket.io";
import ChatMessage from "../models/ChatMessage";
import { FamilyLink } from "../models/FamilyLink";

interface SendMessagePayload {
  familyId: string;
  content: string;
  messageType?: "text" | "image" | "voice";
  mediaUrl?: string;
}

interface TypingPayload {
  familyId: string;
  isTyping: boolean;
}

export const registerChatSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId as string;

  // ── Send a chat message ───────────────────────────────────────
  socket.on("chat:send", async (payload: SendMessagePayload) => {
    try {
      const { familyId, content, messageType = "text", mediaUrl } = payload;

      if (!familyId || !content?.trim()) {
        socket.emit("chat:error", { message: "familyId and content are required." });
        return;
      }

      // Verify sender belongs to this family
      const link = await FamilyLink.findOne({
        familyId,
        userId,
        status: "accepted",
      });
      if (!link) {
        socket.emit("chat:error", { message: "You are not a member of this family group." });
        return;
      }

      // Persist message to DB
      const message = await ChatMessage.create({
        familyId,
        senderId: userId,
        content: content.trim(),
        messageType,
        mediaUrl: mediaUrl || null,
        readBy: [userId], // sender has read it
      });

      const populated = await message.populate("senderId", "name avatar role");

      // Broadcast to entire family room
      io.to(`family:${familyId}`).emit("chat:message", {
        _id: populated._id,
        familyId,
        sender: populated.senderId,
        content: populated.content,
        messageType: populated.messageType,
        mediaUrl: populated.mediaUrl,
        readBy: populated.readBy,
        createdAt: populated.createdAt,
      });
    } catch (err) {
      console.error("chat:send error:", err);
      socket.emit("chat:error", { message: "Failed to send message." });
    }
  });

  // ── Mark messages as read ─────────────────────────────────────
  socket.on("chat:read", async ({ familyId }: { familyId: string }) => {
    try {
      await ChatMessage.updateMany(
        { familyId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      // Notify family room that this user read messages
      socket.to(`family:${familyId}`).emit("chat:read_receipt", {
        userId,
        familyId,
        readAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("chat:read error:", err);
    }
  });

  // ── Typing indicator ──────────────────────────────────────────
  socket.on("chat:typing", ({ familyId, isTyping }: TypingPayload) => {
    socket.to(`family:${familyId}`).emit("chat:typing", {
      userId,
      familyId,
      isTyping,
    });
  });
};
