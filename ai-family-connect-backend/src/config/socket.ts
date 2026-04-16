/**
 * config/socket.ts
 * Creates and configures the Socket.io server instance
 */

import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { registerSocketHandlers } from "../sockets/connection.handler";

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,   // 60s before declaring connection dead
    pingInterval: 25000,  // heartbeat every 25s
    transports: ["websocket", "polling"],
  });

  registerSocketHandlers(io);
  console.log("✅ Socket.io initialized");
  return io;
};

/** Returns the global io instance for use in controllers/services */
export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io not initialized. Call initSocket() first.");
  return io;
};
