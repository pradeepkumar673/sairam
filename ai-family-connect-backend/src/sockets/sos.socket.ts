/**
 * sockets/sos.socket.ts
 * One-Tap SOS real-time broadcast
 */

import { Server as SocketServer, Socket } from "socket.io";
import SOSAlert from "../models/SOSAlert";
import { FamilyLink } from "../models/FamilyLink";

interface SOSPayload {
  familyId: string;
  location?: { lat: number; lng: number; address?: string };
  message?: string;
}

export const registerSOSSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId as string;

  // ── Trigger SOS ───────────────────────────────────────────────
  socket.on("sos:trigger", async (payload: SOSPayload) => {
    try {
      const { familyId, location, message } = payload;

      // Persist SOS alert
      const sos = await SOSAlert.create({
        triggeredBy: userId,
        familyId,
        location: location || null,
        message: message || "Emergency! I need help!",
        status: "active",
      });

      const populated = await sos.populate("triggeredBy", "name phone avatar");

      // Broadcast to entire family with high priority
      io.to(`family:${familyId}`).emit("sos:alert", {
        type: "SOS",
        severity: "critical",
        sosId: sos._id,
        triggeredBy: populated.triggeredBy,
        location: sos.location,
        message: sos.message,
        status: "active",
        timestamp: new Date().toISOString(),
      });

      console.log(`🆘 SOS triggered by user ${userId} in family ${familyId}`);

      // Acknowledge back to sender
      socket.emit("sos:acknowledged", {
        sosId: sos._id,
        message: "SOS alert sent to all family members.",
      });
    } catch (err) {
      console.error("sos:trigger error:", err);
      socket.emit("sos:error", { message: "Failed to trigger SOS." });
    }
  });

  // ── Respond to SOS (family member says "I'm coming") ──────────
  socket.on("sos:respond", async ({ sosId, familyId, responseMessage }) => {
    try {
      await SOSAlert.findByIdAndUpdate(sosId, {
        $push: {
          responses: {
            responderId: userId,
            message: responseMessage || "I'm on my way!",
            respondedAt: new Date(),
          },
        },
      });

      io.to(`family:${familyId}`).emit("sos:response", {
        sosId,
        responderId: userId,
        responseMessage: responseMessage || "I'm on my way!",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("sos:respond error:", err);
    }
  });

  // ── Resolve SOS ───────────────────────────────────────────────
  socket.on("sos:resolve", async ({ sosId, familyId }) => {
    try {
      await SOSAlert.findByIdAndUpdate(sosId, { status: "resolved" });

      io.to(`family:${familyId}`).emit("sos:resolved", {
        sosId,
        resolvedBy: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("sos:resolve error:", err);
    }
  });
};
