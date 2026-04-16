/**
 * sockets/alert.socket.ts
 * Real-time alerts: SOS, fall detection, low medicine stock
 */

import { Server as SocketServer, Socket } from "socket.io";
import { MedicineLog } from "../models/MedicineLog";
import Medicine from "../models/Medicine";

export const registerAlertSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId as string;

  // ── Low medicine stock alert (triggered by cron or client) ────
  socket.on("alert:low_medicine", async ({ familyId }: { familyId: string }) => {
    try {
      // Find medicines with stock <= 5 for this user
      const lowStock = await Medicine.find({
        userId,
        stockCount: { $lte: 5 },
        isActive: true,
      }).select("name stockCount dosage");

      if (lowStock.length > 0) {
        // Alert the entire family
        io.to(`family:${familyId}`).emit("alert:low_medicine", {
          type: "LOW_MEDICINE",
          severity: "warning",
          fromUserId: userId,
          medicines: lowStock,
          message: `⚠️ Low medicine stock detected for ${lowStock.length} medication(s).`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("alert:low_medicine error:", err);
    }
  });

  // ── Fall detected alert ───────────────────────────────────────
  socket.on("alert:fall_detected", ({ familyId, location, deviceData }) => {
    // Broadcast immediately — no DB call needed here, safety.controller handles DB
    io.to(`family:${familyId}`).emit("alert:fall_detected", {
      type: "FALL_DETECTED",
      severity: "critical",
      fromUserId: userId,
      location: location || null,
      deviceData: deviceData || null,
      message: `🚨 Fall detected for a family member! Immediate attention required.`,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Missed medicine alert ─────────────────────────────────────
  socket.on("alert:medicine_missed", ({ familyId, medicineName }) => {
    io.to(`family:${familyId}`).emit("alert:medicine_missed", {
      type: "MEDICINE_MISSED",
      severity: "warning",
      fromUserId: userId,
      medicineName,
      message: `💊 Medicine "${medicineName}" was missed.`,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Custom family broadcast (used by server-side services) ────
  socket.on("alert:custom", ({ familyId, type, severity, message, data }) => {
    io.to(`family:${familyId}`).emit("alert:custom", {
      type,
      severity: severity || "info",
      fromUserId: userId,
      message,
      data: data || null,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Utility: Emit an alert to a family room from server-side code
 * (used by controllers/cron jobs without a socket reference)
 */
export const emitFamilyAlert = (
  io: SocketServer,
  familyId: string,
  event: string,
  payload: object
): void => {
  io.to(`family:${familyId}`).emit(event, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Utility: Emit an alert to a specific user room
 */
export const emitUserAlert = (
  io: SocketServer,
  userId: string,
  event: string,
  payload: object
): void => {
  io.to(`user:${userId}`).emit(event, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
};
