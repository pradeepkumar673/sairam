/**
 * sockets/sos.socket.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-Tap SOS — real-time emergency broadcast (Feature 3)
 *
 * Events (client → server):
 *   sos:trigger  — user taps SOS button
 *   sos:respond  — family member says "I'm on my way"
 *   sos:resolve  — mark SOS as resolved
 *
 * Events (server → client):
 *   sos:alert        — broadcast to entire family room
 *   sos:acknowledged — confirm receipt to SOS sender
 *   sos:response     — notify family of a response
 *   sos:resolved     — notify family SOS is closed
 *   sos:error        — error message
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Server as SocketServer, Socket } from "socket.io";
import { Types }   from "mongoose";
import SOSAlert    from "../models/SOSAlert";
import FamilyLink  from "../models/FamilyLink";

interface SOSPayload {
  familyId:  string;
  location?: { lat: number; lng: number; address?: string };
  message?:  string;
}

export const registerSOSSocket = (io: SocketServer, socket: Socket): void => {
  const userId = socket.data.userId as string;

  // ── Trigger SOS ───────────────────────────────────────────────────────────
  socket.on("sos:trigger", async (payload: SOSPayload) => {
    try {
      const { familyId, location, message } = payload;

      if (!familyId) {
        socket.emit("sos:error", { message: "familyId is required." });
        return;
      }

      // Verify user is in the family before allowing SOS
      const link = await FamilyLink.findOne({
        familyId:     new Types.ObjectId(familyId),
        linkedUserId: new Types.ObjectId(userId),
        status:       "accepted",
      });
      if (!link) {
        socket.emit("sos:error", { message: "You are not a member of this family group." });
        return;
      }

      // Build the location sub-document in the shape SOSAlert.location expects
      const locationField = location
        ? {
            type:        "Point" as const,
            coordinates: [location.lng, location.lat],
            address:     location.address,
          }
        : undefined;

      // Persist SOS alert
      const sos = await SOSAlert.create({
        userId:      new Types.ObjectId(userId),
        familyId:    new Types.ObjectId(familyId),
        location:    locationField,
        message:     message ?? "Emergency! I need help!",
        status:      "active",
      });

      const populated = await sos.populate("userId", "firstName lastName phone avatar");

      // Broadcast to the entire family room
      io.to(`family:${familyId}`).emit("sos:alert", {
        type:        "SOS",
        severity:    "critical",
        sosId:       sos._id,
        triggeredBy: populated.userId,
        location:    sos.location,
        message:     sos.message,
        status:      "active",
        timestamp:   new Date().toISOString(),
      });

      console.log(`🆘 SOS triggered by user ${userId} in family ${familyId}`);

      // Acknowledge back to sender
      socket.emit("sos:acknowledged", {
        sosId:   sos._id,
        message: "SOS alert sent to all family members.",
      });
    } catch (err) {
      console.error("sos:trigger error:", err);
      socket.emit("sos:error", { message: "Failed to trigger SOS." });
    }
  });

  // ── Respond to SOS (family member says "I'm coming") ────────────────────
  socket.on("sos:respond", async ({ sosId, familyId, responseMessage }: {
    sosId:            string;
    familyId:         string;
    responseMessage?: string;
  }) => {
    try {
      await SOSAlert.findByIdAndUpdate(sosId, {
        $push: {
          responses: {
            responderId:  new Types.ObjectId(userId),
            message:      responseMessage ?? "I'm on my way!",
            respondedAt:  new Date(),
          } as any,
        },
      });

      io.to(`family:${familyId}`).emit("sos:response", {
        sosId,
        responderId:     userId,
        responseMessage: responseMessage ?? "I'm on my way!",
        timestamp:       new Date().toISOString(),
      });
    } catch (err) {
      console.error("sos:respond error:", err);
    }
  });

  // ── Resolve SOS ──────────────────────────────────────────────────────────
  socket.on("sos:resolve", async ({ sosId, familyId }: { sosId: string; familyId: string }) => {
    try {
      await SOSAlert.findByIdAndUpdate(sosId, {
        status:     "resolved",
        resolvedAt: new Date(),
        resolvedBy: new Types.ObjectId(userId),
      });

      io.to(`family:${familyId}`).emit("sos:resolved", {
        sosId,
        resolvedBy: userId,
        timestamp:  new Date().toISOString(),
      });
    } catch (err) {
      console.error("sos:resolve error:", err);
    }
  });
};
