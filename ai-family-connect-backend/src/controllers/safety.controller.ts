import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { SOSAlert } from "../models/SOSAlert";
import { FallEvent } from "../models/FallEvent";
import { FamilyLink } from "../models/FamilyLink";
import { User } from "../models/User";

// ══════════════════════════════════════════════════════════
//  ONE-TAP SOS
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/safety/sos
 * @desc    Trigger an SOS alert. Notifies all linked family members via Socket.io.
 *          Stores the alert in DB with GPS location if provided.
 * @access  Private
 * @body    { latitude?, longitude?, message?, address? }
 */
export const triggerSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, message, address } = req.body;
    const userId = req.user?.id;

    // Fetch the user's name for notification content
    const user = await User.findById(userId).select("name");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    // Create SOS record
    const sosAlert = await SOSAlert.create({
      triggeredBy: userId,
      message: message || `${user.name} has triggered an SOS alert and needs help!`,
      location: {
        latitude: latitude || null,
        longitude: longitude || null,
        address: address || null,
      },
      status: "active",
      notifiedMembers: [],
    });

    // Find all linked family members to notify
    const links = await FamilyLink.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    }).populate("requester recipient", "_id name");

    const familyMemberIds: string[] = links.map((link) => {
      const requester = link.requester as any;
      const recipient = link.recipient as any;
      return requester._id.toString() === userId
        ? recipient._id.toString()
        : requester._id.toString();
    });

    // Update the SOS with who was notified
    sosAlert.notifiedMembers = familyMemberIds as any;
    await sosAlert.save();

    // ─────────────────────────────────────────────
    // Socket.io real-time notification
    // The app's io instance is attached to req.app
    // ─────────────────────────────────────────────
    const io = (req.app as any).get("io");
    if (io) {
      familyMemberIds.forEach((memberId) => {
        io.to(`user_${memberId}`).emit("sos_alert", {
          alertId: sosAlert._id,
          triggeredBy: { id: userId, name: user.name },
          message: sosAlert.message,
          location: sosAlert.location,
          timestamp: sosAlert.createdAt,
        });
      });
    }

    res.status(201).json({
      success: true,
      message: "SOS alert triggered. Family members have been notified.",
      alert: sosAlert,
      notifiedCount: familyMemberIds.length,
    });
  } catch (error: any) {
    console.error("[SAFETY] TriggerSOS error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   PUT /api/safety/sos/:alertId/resolve
 * @desc    Mark an SOS alert as resolved (user is safe)
 * @access  Private
 */
export const resolveSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await SOSAlert.findOneAndUpdate(
      { _id: req.params.alertId, triggeredBy: req.user?.id, status: "active" },
      { status: "resolved", resolvedAt: new Date() },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({ success: false, message: "Active SOS alert not found." });
      return;
    }

    // Notify family that the user is safe
    const io = (req.app as any).get("io");
    if (io) {
      (alert.notifiedMembers as any[]).forEach((memberId) => {
        io.to(`user_${memberId}`).emit("sos_resolved", {
          alertId: alert._id,
          message: "The SOS alert has been resolved. The user is safe.",
          resolvedAt: alert.resolvedAt,
        });
      });
    }

    res.status(200).json({ success: true, message: "SOS alert resolved.", alert });
  } catch (error: any) {
    console.error("[SAFETY] ResolveSOS error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/safety/sos/history
 * @desc    Get SOS alert history for the current user or a linked family member
 * @access  Private
 * @query   ?userId=<id>&limit=10
 */
export const getSOSHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const alerts = await SOSAlert.find({ triggeredBy: targetUserId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("triggeredBy", "name email");

    res.status(200).json({ success: true, count: alerts.length, alerts });
  } catch (error: any) {
    console.error("[SAFETY] GetSOSHistory error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════
//  SMART FALL & POSTURE SENTINEL
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/safety/fall-event
 * @desc    Log a detected fall event (from device sensor or manual report).
 *          Notifies family via Socket.io and stores in DB.
 * @access  Private
 * @body    { latitude?, longitude?, severity?, deviceData?, description? }
 */
export const reportFallEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, severity, deviceData, description } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId).select("name");

    const fallEvent = await FallEvent.create({
      user: userId,
      location: {
        latitude: latitude || null,
        longitude: longitude || null,
      },
      severity: severity || "unknown",   // "low" | "medium" | "high" | "unknown"
      deviceData: deviceData || null,    // raw accelerometer/gyroscope data
      description: description || "A fall was detected.",
      status: "unreviewed",
    });

    // Find linked family members and notify
    const links = await FamilyLink.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    });

    const familyMemberIds: string[] = links.map((link) => {
      const requester = link.requester as any;
      const recipient = link.recipient as any;
      return requester.toString() === userId
        ? recipient.toString()
        : requester.toString();
    });

    const io = (req.app as any).get("io");
    if (io) {
      familyMemberIds.forEach((memberId) => {
        io.to(`user_${memberId}`).emit("fall_detected", {
          eventId: fallEvent._id,
          user: { id: userId, name: user?.name },
          severity: fallEvent.severity,
          description: fallEvent.description,
          location: fallEvent.location,
          timestamp: fallEvent.createdAt,
        });
      });
    }

    res.status(201).json({
      success: true,
      message: "Fall event recorded. Family notified.",
      fallEvent,
    });
  } catch (error: any) {
    console.error("[SAFETY] ReportFallEvent error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   PUT /api/safety/fall-event/:eventId/review
 * @desc    Mark a fall event as reviewed (e.g. "false alarm" or "attended")
 * @access  Private
 * @body    { status: "false_alarm" | "attended", reviewNotes? }
 */
export const reviewFallEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, reviewNotes } = req.body;

    if (!["false_alarm", "attended"].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be "false_alarm" or "attended".' });
      return;
    }

    const event = await FallEvent.findByIdAndUpdate(
      req.params.eventId,
      { status, reviewNotes: reviewNotes || "", reviewedAt: new Date(), reviewedBy: req.user?.id },
      { new: true }
    );

    if (!event) {
      res.status(404).json({ success: false, message: "Fall event not found." });
      return;
    }

    res.status(200).json({ success: true, message: "Fall event reviewed.", event });
  } catch (error: any) {
    console.error("[SAFETY] ReviewFallEvent error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/safety/fall-events
 * @desc    Get fall event history for a user
 * @access  Private
 * @query   ?userId=<id>&limit=20
 */
export const getFallEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const events = await FallEvent.find({ user: targetUserId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("reviewedBy", "name");

    res.status(200).json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error("[SAFETY] GetFallEvents error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════
//  INJURY PHOTO ANALYZER
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/safety/injury-photo
 * @desc    Upload an injury photo for AI analysis by Gemini.
 *          Photo is saved; analysis is triggered separately or on-demand.
 * @access  Private
 * @form    injuryImage (file), bodyPart?, description?
 */
export const uploadInjuryPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No image uploaded. Please attach an injury photo." });
      return;
    }

    const { bodyPart, description } = req.body;
    const imageUrl = `/uploads/injury-photos/${req.file.filename}`;

    // Save injury report to a FallEvent with type "injury_photo"
    const injuryRecord = await FallEvent.create({
      user: req.user?.id,
      type: "injury_photo",             // distinguishes from sensor-based falls
      injuryPhotoUrl: imageUrl,
      bodyPart: bodyPart || "unspecified",
      description: description || "Injury photo uploaded for analysis.",
      severity: "unknown",
      status: "pending_ai_analysis",    // Gemini will analyze this
      location: {},
    });

    res.status(201).json({
      success: true,
      message: "Injury photo uploaded. AI analysis will assess the injury.",
      injuryImageUrl: imageUrl,
      recordId: injuryRecord._id,
      note: "Call POST /api/safety/injury/:id/analyze to trigger Gemini analysis.",
    });
  } catch (error: any) {
    console.error("[SAFETY] UploadInjuryPhoto error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/safety/injury-photos
 * @desc    Get all injury photo records for the current user
 * @access  Private
 */
export const getInjuryPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const records = await FallEvent.find({
      user: req.user?.id,
      type: "injury_photo",
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: records.length, records });
  } catch (error: any) {
    console.error("[SAFETY] GetInjuryPhotos error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════
//  POSTURE SENTINEL
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/safety/posture-alert
 * @desc    Log a posture issue detected by the device (e.g. slouching, no movement)
 * @access  Private
 * @body    { type: "no_movement" | "bad_posture" | "inactivity", duration?, deviceData? }
 */
export const reportPostureAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, duration, deviceData, description } = req.body;
    const userId = req.user?.id;

    const validTypes = ["no_movement", "bad_posture", "inactivity", "unusual_posture"];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ success: false, message: `type must be one of: ${validTypes.join(", ")}` });
      return;
    }

    // Store posture alerts as a special FallEvent type
    const postureAlert = await FallEvent.create({
      user: userId,
      type: "posture_alert",
      postureType: type,
      duration: duration || null,      // in seconds
      deviceData: deviceData || null,
      description: description || `Posture alert: ${type.replace("_", " ")}`,
      severity: type === "no_movement" ? "medium" : "low",
      status: "unreviewed",
      location: {},
    });

    // Notify family for "no_movement" which could indicate a serious issue
    if (type === "no_movement") {
      const user = await User.findById(userId).select("name");
      const links = await FamilyLink.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: "accepted",
      });

      const familyMemberIds: string[] = links.map((link) => {
        const req_ = link.requester as any;
        const rec_ = link.recipient as any;
        return req_.toString() === userId ? rec_.toString() : req_.toString();
      });

      const io = (req.app as any).get("io");
      if (io) {
        familyMemberIds.forEach((memberId) => {
          io.to(`user_${memberId}`).emit("posture_alert", {
            alertId: postureAlert._id,
            user: { id: userId, name: user?.name },
            type,
            message: `No movement detected for ${duration ? `${duration} seconds` : "an extended period"}.`,
            timestamp: postureAlert.createdAt,
          });
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Posture alert recorded.",
      alert: postureAlert,
    });
  } catch (error: any) {
    console.error("[SAFETY] ReportPostureAlert error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/safety/posture-alerts
 * @desc    Get posture alert history for a user
 * @access  Private
 * @query   ?userId=<id>&limit=20
 */
export const getPostureAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const alerts = await FallEvent.find({
      user: targetUserId,
      type: "posture_alert",
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ success: true, count: alerts.length, alerts });
  } catch (error: any) {
    console.error("[SAFETY] GetPostureAlerts error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
