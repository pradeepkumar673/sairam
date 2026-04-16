import { Server as SocketServer } from "socket.io";
import { verifySocketToken } from "../middleware/auth.middleware";
import { registerChatSocket } from "./chat.socket";
import { registerAlertSocket } from "./alert.socket";

export const registerSocketHandlers = (io: SocketServer): void => {
  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 Socket connected: ${socket.id} | User: ${userId}`);

    socket.join(`user:${userId}`);

    registerChatSocket(io, socket);
    registerAlertSocket(io, socket);

    socket.on("disconnect", () => console.log(`❌ Socket disconnected: ${socket.id}`));
  });
};