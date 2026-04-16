import { Server as SocketServer, Socket } from "socket.io";
import { Types } from "mongoose";
import ChatMessage from "../models/ChatMessage";

export const registerChatSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId;

  socket.on("chat:send", async ({ familyId, content, messageType, mediaUrl, replyTo }) => {
    if (!familyId || !content?.trim()) return;

    const message = await ChatMessage.create({
      familyId: new Types.ObjectId(familyId),
      senderId: new Types.ObjectId(userId),
      content: content.trim(),
      messageType: messageType || "text",
      mediaUrl,
      replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
      readBy: [{ userId: new Types.ObjectId(userId), readAt: new Date() }],
    });

    await message.populate("senderId", "firstName lastName avatar");

    io.to(`family:${familyId}`).emit("chat:message", message);
  });

  socket.on("chat:read", async ({ familyId }) => {
    await ChatMessage.updateMany(
      {
        familyId: new Types.ObjectId(familyId),
        "readBy.userId": { $ne: new Types.ObjectId(userId) },
        senderId: { $ne: new Types.ObjectId(userId) },
      },
      { $addToSet: { readBy: { userId: new Types.ObjectId(userId), readAt: new Date() } } }
    );
    socket.to(`family:${familyId}`).emit("chat:read_receipt", { userId, familyId });
  });

  socket.on("chat:typing", ({ familyId, isTyping }) => {
    socket.to(`family:${familyId}`).emit("chat:typing", { userId, isTyping });
  });
};