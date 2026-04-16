import { Server as SocketServer, Socket } from "socket.io";

export const registerAlertSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId;

  socket.on("alert:low_medicine", ({ familyId }) => {
    io.to(`family:${familyId}`).emit("alert:low_medicine", {
      type: "LOW_MEDICINE",
      fromUserId: userId,
      message: "Low medicine stock detected.",
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("alert:fall_detected", ({ familyId, location }) => {
    io.to(`family:${familyId}`).emit("alert:fall_detected", {
      type: "FALL_DETECTED",
      fromUserId: userId,
      location,
      message: "Fall detected!",
      timestamp: new Date().toISOString(),
    });
  });
};

export const emitFamilyAlert = (io: SocketServer, familyId: string, event: string, payload: object) => {
  io.to(`family:${familyId}`).emit(event, { ...payload, timestamp: new Date().toISOString() });
};

export const emitUserAlert = (io: SocketServer, userId: string, event: string, payload: object) => {
  io.to(`user:${userId}`).emit(event, { ...payload, timestamp: new Date().toISOString() });
};