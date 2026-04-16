/**
 * sockets/connection.handler.ts
 * Master Socket.io connection handler — registers all socket namespaces
 */

import { Server as SocketServer } from "socket.io";
import { registerChatSocket } from "./chat.socket";
import { registerAlertSocket } from "./alert.socket";
import { registerSOSSocket } from "./sos.socket";
import { registerLocationSocket } from "./location.socket";
import { verifySocketToken } from "../middleware/auth.middleware";

export const registerSocketHandlers = (io: SocketServer): void => {
  // ── JWT Authentication middleware for all sockets ──────────────
  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const familyId = socket.data.familyId as string | undefined;

    console.log(`🔌 Socket connected: ${socket.id} | User: ${userId}`);

    // Join personal room so we can target this user directly
    socket.join(`user:${userId}`);

    // Join shared family room if user belongs to one
    if (familyId) {
      socket.join(`family:${familyId}`);
      console.log(`👨👩👧 User ${userId} joined family room: family:${familyId}`);
    }

    // Register feature-specific handlers
    registerChatSocket(io, socket);
    registerAlertSocket(io, socket);
    registerSOSSocket(io, socket);
    registerLocationSocket(io, socket);

    // ── Disconnect ──────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // ── Ping/Pong keep-alive ────────────────────────────────────
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });
  });
};
