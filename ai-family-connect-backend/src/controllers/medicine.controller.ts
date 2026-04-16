import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Medicine from "../models/Medicine";
import MedicineLog from "../models/MedicineLog";
import FamilyLink from "../models/FamilyLink";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import { scanDoctorSlipGemini } from "../helpers/gemini.helper";
import { imageFileToBase64, getMimeType } from "../config/gemini";

export const addMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    name, dosage, unit, frequency, timesPerDay, startDate, endDate,
    totalQuantity, refillThreshold, notes, forUserId,
  } = req.body;

  if (!name || !dosage || !frequency) {
    throw new AppError("name, dosage, and frequency are required.", 400);
  }

  const medicine = await Medicine.create({
    user: forUserId || req.user?.id,
    addedBy: req.user?.id,
    name,
    dosage,
    unit: unit || "mg",
    frequency,
    timesPerDay: timesPerDay || [],
    startDate: startDate || new Date(),
    endDate: endDate || null,
    totalQuantity: totalQuantity ?? null,
    currentStock: totalQuantity ?? null,
    refillThreshold: refillThreshold ?? 5,
    notes: notes || "",
    isActive: true,
  });

  res.status(201).json(new ApiResponse(201, { medicine }, "Medicine added."));
});

export const getMedicines = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;

  if (targetUserId !== req.user?.id) {
    const isLinked = await FamilyLink.findOne({
      $or: [
        { requester: req.user?.id, recipient: targetUserId },
        { requester: targetUserId, recipient: req.user?.id },
      ],
      status: "accepted",
    });
    if (!isLinked) throw new AppError("You are not linked to this user.", 403);
  }

  const medicines = await Medicine.find({ user: targetUserId, isActive: true }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, { medicines }));
});

export const getMedicineById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) throw new AppError("Medicine not found.", 404);

  if (medicine.user.toString() !== req.user?.id) {
    const isLinked = await FamilyLink.findOne({
      $or: [
        { requester: req.user?.id, recipient: medicine.user },
        { requester: medicine.user, recipient: req.user?.id },
      ],
      status: "accepted",
    });
    if (!isLinked) throw new AppError("Access denied.", 403);
  }

  res.status(200).json(new ApiResponse(200, { medicine }));
});

export const updateMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const medicine = await Medicine.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user?.id }, { addedBy: req.user?.id }] },
    { ...req.body },
    { new: true, runValidators: true }
  );

  if (!medicine) throw new AppError("Medicine not found or access denied.", 404);
  res.status(200).json(new ApiResponse(200, { medicine }, "Medicine updated."));
});

export const deleteMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const medicine = await Medicine.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user?.id }, { addedBy: req.user?.id }] },
    { isActive: false },
    { new: true }
  );

  if (!medicine) throw new AppError("Medicine not found or access denied.", 404);
  res.status(200).json(new ApiResponse(200, null, "Medicine removed."));
});

export const logDose = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, scheduledTime, takenAt, notes } = req.body;

  if (!["taken", "missed", "skipped"].includes(status)) {
    throw new AppError('status must be "taken", "missed", or "skipped".', 400);
  }

  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) throw new AppError("Medicine not found.", 404);

  const log = await MedicineLog.create({
    medicine: medicine._id,
    user: medicine.user,
    loggedBy: req.user?.id,
    status,
    scheduledTime: scheduledTime || new Date(),
    takenAt: status === "taken" ? (takenAt || new Date()) : null,
    notes: notes || "",
  });

  if (status === "taken" && medicine.currentStock !== null) {
    medicine.currentStock = Math.max(0, medicine.currentStock - 1);
    await medicine.save();
  }

  res.status(201).json(new ApiResponse(201, { log }, `Dose logged as ${status}.`));
});

export const getMedicineLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await MedicineLog.find({
    medicine: req.params.id,
    scheduledTime: { $gte: since },
  }).sort({ scheduledTime: -1 });

  const total = logs.length;
  const taken = logs.filter((l) => l.status === "taken").length;
  const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

  res.status(200).json(new ApiResponse(200, {
    complianceRate: `${complianceRate}%`,
    total,
    taken,
    missed: logs.filter((l) => l.status === "missed").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
    logs,
  }));
});

export const getComplianceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await MedicineLog.find({
    user: targetUserId,
    scheduledTime: { $gte: since },
  }).populate("medicine", "name dosage unit");

  const total = logs.length;
  const taken = logs.filter((l) => l.status === "taken").length;
  const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

  res.status(200).json(new ApiResponse(200, {
    period: `Last ${days} days`,
    complianceRate: `${complianceRate}%`,
    total,
    taken,
    missed: logs.filter((l) => l.status === "missed").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
  }));
});

export const scanDoctorSlip = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError("No image uploaded.", 400);

  const imagePath = req.file.path;
  const imageBase64 = imageFileToBase64(imagePath);
  const mimeType = getMimeType(req.file.originalname);

  const result = await scanDoctorSlipGemini(imageBase64, mimeType);

  const createdMeds = [];
  for (const med of result.medicines) {
    const newMed = await Medicine.create({
      user: req.user?.id,
      addedBy: req.user?.id,
      name: med.name,
      dosage: parseFloat(med.dosage) || 1,
      unit: "mg",
      frequency: "custom",
      timesPerDay: [],
      instructions: med.instructions,
      notes: `From doctor slip scan. Diagnosis: ${result.diagnosis || "N/A"}`,
    });
    createdMeds.push(newMed);
  }

  res.status(200).json(new ApiResponse(200, {
    slipAnalysis: result,
    createdMedicines: createdMeds,
  }, "Doctor slip scanned and medicines created."));
});

export const getRefillAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;

  const lowMedicines = await Medicine.find({
    user: targetUserId,
    isActive: true,
    $expr: { $and: [{ $ne: ["$currentStock", null] }, { $lte: ["$currentStock", "$refillThreshold"] }] },
  });

  const alerts = lowMedicines.map((med) => ({
    medicineId: med._id,
    name: med.name,
    dosage: `${med.dosage} ${med.unit}`,
    currentStock: med.currentStock,
    refillThreshold: med.refillThreshold,
    urgency: med.currentStock === 0 ? "CRITICAL" : med.currentStock! <= 3 ? "HIGH" : "MEDIUM",
  }));

  res.status(200).json(new ApiResponse(200, { refillAlerts: alerts }));
});

export const restockMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) throw new AppError("Valid restock quantity required.", 400);

  const medicine = await Medicine.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user?.id }, { addedBy: req.user?.id }] },
    { $inc: { currentStock: quantity }, refillAlertSent: false, lastRestockedAt: new Date() },
    { new: true }
  );

  if (!medicine) throw new AppError("Medicine not found or access denied.", 404);
  res.status(200).json(new ApiResponse(200, { medicine }, `Stock updated. New stock: ${medicine.currentStock}`));
});