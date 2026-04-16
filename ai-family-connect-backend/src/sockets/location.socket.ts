/**
 * sockets/location.socket.ts
 * Real-time location sharing within a family
 */

import { Server as SocketServer, Socket } from "socket.io";

interface LocationPayload {
  familyId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  address?: string;
}

export const registerLocationSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId as string;

  // ── Share live location ────────────────────────────────────────
  socket.on("location:update", (payload: LocationPayload) => {
    const { familyId, lat, lng, accuracy, speed, heading, address } = payload;

    // Broadcast updated location to family (excluding sender)
    socket.to(`family:${familyId}`).emit("location:updated", {
      userId,
      lat,
      lng,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      address: address || null,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Stop sharing location ──────────────────────────────────────
  socket.on("location:stop", ({ familyId }: { familyId: string }) => {
    socket.to(`family:${familyId}`).emit("location:stopped", {
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Request another member's location ─────────────────────────
  socket.on("location:request", ({ targetUserId }: { targetUserId: string }) => {
    io.to(`user:${targetUserId}`).emit("location:requested", {
      requestedBy: userId,
      timestamp: new Date().toISOString(),
    });
  });
};
