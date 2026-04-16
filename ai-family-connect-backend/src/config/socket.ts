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
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  registerSocketHandlers(io);
  console.log("✅ Socket.io initialized");
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io not initialized.");
  return io;
};