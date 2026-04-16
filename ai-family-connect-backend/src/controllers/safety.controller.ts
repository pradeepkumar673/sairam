import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import SOSAlert from "../models/SOSAlert";
import FallEvent from "../models/FallEvent";
import FamilyLink from "../models/FamilyLink";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import { getIO } from "../config/socket";
import { analyzeInjuryGemini } from "../helpers/gemini.helper";
import { imageFileToBase64, getMimeType } from "../config/gemini";

// SOS
export const triggerSOS = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, message, address } = req.body;
  const userId = req.user?.id;

  const user = await User.findById(userId).select("firstName lastName");
  if (!user) throw new AppError("User not found.", 404);

  const sosAlert = await SOSAlert.create({
    triggeredBy: userId,
    message: message || `🚨 ${user.firstName} has triggered an SOS alert!`,
    location: { latitude, longitude, address },
    status: "active",
    notifiedMembers: [],
  });

  const links = await FamilyLink.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  }).populate("requester recipient", "_id");

  const familyMemberIds = links.map((link: any) => {
    const other = link.requester._id.toString() === userId ? link.recipient._id : link.requester._id;
    return other.toString();
  });

  sosAlert.notifiedMembers = familyMemberIds as any;
  await sosAlert.save();

  const io = getIO();
  familyMemberIds.forEach((memberId) => {
    io.to(`user:${memberId}`).emit("sos:alert", {
      alertId: sosAlert._id,
      triggeredBy: { id: userId, name: user.fullName() },
      message: sosAlert.message,
      location: sosAlert.location,
      timestamp: sosAlert.createdAt,
    });
  });

  res.status(201).json(new ApiResponse(201, { alert: sosAlert, notifiedCount: familyMemberIds.length }));
});

export const resolveSOS = asyncHandler(async (req: AuthRequest, res: Response) => {
  const alert = await SOSAlert.findOneAndUpdate(
    { _id: req.params.alertId, triggeredBy: req.user?.id, status: "active" },
    { status: "resolved", resolvedAt: new Date() },
    { new: true }
  );

  if (!alert) throw new AppError("Active SOS alert not found.", 404);

  const io = getIO();
  (alert.notifiedMembers as any[]).forEach((memberId) => {
    io.to(`user:${memberId}`).emit("sos:resolved", {
      alertId: alert._id,
      message: "The SOS alert has been resolved. The user is safe.",
    });
  });

  res.status(200).json(new ApiResponse(200, { alert }));
});

export const getSOSHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;
  const limit = parseInt(req.query.limit as string) || 10;

  const alerts = await SOSAlert.find({ triggeredBy: targetUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("triggeredBy", "firstName lastName email");

  res.status(200).json(new ApiResponse(200, { alerts }));
});

// Fall Events
export const reportFallEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, severity, deviceData, description } = req.body;
  const userId = req.user?.id;

  const user = await User.findById(userId).select("firstName");
  if (!user) throw new AppError("User not found.", 404);

  const fallEvent = await FallEvent.create({
    userId,
    location: { latitude, longitude },
    severity: severity || "unknown",
    deviceData: deviceData || null,
    description: description || "Automatic fall detection trigger.",
    status: "unreviewed",
  });

  const links = await FamilyLink.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  });

  const familyMemberIds = links.map((link: any) =>
    link.requester.toString() === userId ? link.recipient.toString() : link.requester.toString()
  );

  const io = getIO();
  familyMemberIds.forEach((memberId) => {
    io.to(`user:${memberId}`).emit("fall:detected", {
      eventId: fallEvent._id,
      user: { id: userId, name: user.firstName },
      severity: fallEvent.severity,
      description: fallEvent.description,
      location: fallEvent.location,
      timestamp: fallEvent.createdAt,
    });
  });

  res.status(201).json(new ApiResponse(201, { fallEvent }));
});

export const reviewFallEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, reviewNotes } = req.body;

  if (!["false_alarm", "attended"].includes(status)) {
    throw new AppError('Status must be "false_alarm" or "attended".', 400);
  }

  const event = await FallEvent.findByIdAndUpdate(
    req.params.eventId,
    { status, reviewNotes: reviewNotes || "", reviewedAt: new Date(), reviewedBy: req.user?.id },
    { new: true }
  );

  if (!event) throw new AppError("Fall event not found.", 404);
  res.status(200).json(new ApiResponse(200, { event }, "Fall event reviewed."));
});

export const getFallEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const events = await FallEvent.find({ user: targetUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reviewedBy", "firstName lastName");

  res.status(200).json(new ApiResponse(200, { events }));
});

// Injury Photo Analyzer
export const uploadInjuryPhoto = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError("No image uploaded.", 400);

  const { bodyPart, description } = req.body;
  const imagePath = req.file.path;
  const imageBase64 = imageFileToBase64(imagePath);
  const mimeType = getMimeType(req.file.originalname);

  const analysis = await analyzeInjuryGemini(imageBase64, mimeType);

  const injuryRecord = await FallEvent.create({
    userId: req.user?.id,
    type: "injury_photo",
    injuryPhotoUrl: `/uploads/${req.file.filename}`,
    bodyPart: bodyPart || "unspecified",
    description: description || "Injury photo uploaded.",
    severity: analysis.severity,
    status: "pending_ai_analysis",
    aiAnalysis: analysis,
  });

  res.status(201).json(new ApiResponse(201, { injuryRecord, analysis }));
});

export const getInjuryPhotos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const records = await FallEvent.find({
    userId: req.user?.id,
    type: "injury_photo",
  }).sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, { records }));
});

// Posture Sentinel
export const reportPostureAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, duration, deviceData, description } = req.body;
  const userId = req.user?.id;

  const validTypes = ["no_movement", "bad_posture", "inactivity", "unusual_posture"];
  if (!type || !validTypes.includes(type)) {
    throw new AppError(`type must be one of: ${validTypes.join(", ")}`, 400);
  }

  const postureAlert = await FallEvent.create({
    userId,
    type: "posture_alert",
    postureType: type,
    duration: duration || null,
    deviceData: deviceData || null,
    description: description || `Posture alert: ${type}`,
    severity: type === "no_movement" ? "medium" : "low",
    status: "unreviewed",
  });

  if (type === "no_movement") {
    const user = await User.findById(userId).select("firstName");
    const links = await FamilyLink.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    });

    const familyMemberIds = links.map((link: any) =>
      link.requester.toString() === userId ? link.recipient.toString() : link.requester.toString()
    );

    const io = getIO();
    familyMemberIds.forEach((memberId) => {
      io.to(`user:${memberId}`).emit("posture:alert", {
        alertId: postureAlert._id,
        user: { id: userId, name: user?.firstName },
        type,
        message: `⚠️ No movement detected for ${user?.firstName}.`,
        timestamp: postureAlert.createdAt,
      });
    });
  }

  res.status(201).json(new ApiResponse(201, { alert: postureAlert }));
});

export const getPostureAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const alerts = await FallEvent.find({
    user: targetUserId,
    type: "posture_alert",
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json(new ApiResponse(200, { alerts }));
});