import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Medicine } from "../models/Medicine";
import { MedicineLog } from "../models/MedicineLog";
import { FamilyLink } from "../models/FamilyLink";
import fs from "fs";

// ══════════════════════════════════════════════════════════
//  MEDICINE CRUD
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/medicine
 * @desc    Add a new medicine to the current user's schedule
 * @access  Private
 */
export const addMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      dosage,
      unit,
      frequency,        // e.g. "daily", "twice_daily", "weekly"
      timesPerDay,      // e.g. ["08:00", "20:00"]
      startDate,
      endDate,
      totalQuantity,    // total pills/doses in stock
      refillThreshold,  // alert when stock drops to this number
      notes,
      forUserId,        // optional: family member managing medicine for elder
    } = req.body;

    if (!name || !dosage || !frequency) {
      res.status(400).json({ success: false, message: "name, dosage, and frequency are required." });
      return;
    }

    const medicine = await Medicine.create({
      user: forUserId || req.user?.id,  // can be added for a linked family member
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

    res.status(201).json({ success: true, message: "Medicine added successfully.", medicine });
  } catch (error: any) {
    console.error("[MEDICINE] AddMedicine error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/medicine
 * @desc    Get all medicines for the current user (or a linked elder)
 * @access  Private
 * @query   ?userId=<id>  (optional - view medicines for a linked family member)
 */
export const getMedicines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id;

    // If querying for another user, verify they are a linked family member
    if (targetUserId !== req.user?.id) {
      const isLinked = await FamilyLink.findOne({
        $or: [
          { requester: req.user?.id, recipient: targetUserId },
          { requester: targetUserId, recipient: req.user?.id },
        ],
        status: "accepted",
      });
      if (!isLinked) {
        res.status(403).json({ success: false, message: "You are not linked to this user." });
        return;
      }
    }

    const medicines = await Medicine.find({ user: targetUserId, isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: medicines.length, medicines });
  } catch (error: any) {
    console.error("[MEDICINE] GetMedicines error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/medicine/:id
 * @desc    Get a single medicine by ID
 * @access  Private
 */
export const getMedicineById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      res.status(404).json({ success: false, message: "Medicine not found." });
      return;
    }

    // Only the user or a linked family member can view
    if (medicine.user.toString() !== req.user?.id) {
      const isLinked = await FamilyLink.findOne({
        $or: [
          { requester: req.user?.id, recipient: medicine.user },
          { requester: medicine.user, recipient: req.user?.id },
        ],
        status: "accepted",
      });
      if (!isLinked) {
        res.status(403).json({ success: false, message: "Access denied." });
        return;
      }
    }

    res.status(200).json({ success: true, medicine });
  } catch (error: any) {
    console.error("[MEDICINE] GetMedicineById error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   PUT /api/medicine/:id
 * @desc    Update a medicine's details
 * @access  Private
 */
export const updateMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: req.user?.id }, { addedBy: req.user?.id }] },
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!medicine) {
      res.status(404).json({ success: false, message: "Medicine not found or access denied." });
      return;
    }

    res.status(200).json({ success: true, message: "Medicine updated.", medicine });
  } catch (error: any) {
    console.error("[MEDICINE] UpdateMedicine error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   DELETE /api/medicine/:id
 * @desc    Soft-delete a medicine (set isActive = false)
 * @access  Private
 */
export const deleteMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: req.user?.id }, { addedBy: req.user?.id }] },
      { isActive: false },
      { new: true }
    );

    if (!medicine) {
      res.status(404).json({ success: false, message: "Medicine not found or access denied." });
      return;
    }

    res.status(200).json({ success: true, message: "Medicine removed from schedule." });
  } catch (error: any) {
    console.error("[MEDICINE] DeleteMedicine error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════
//  COMPLIANCE TRACKING (taken / missed logs)
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/medicine/:id/log
 * @desc    Log a dose as "taken" or "missed" for a specific medicine
 * @access  Private
 * @body    { status: "taken" | "missed", scheduledTime, takenAt? }
 */
export const logDose = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, scheduledTime, takenAt, notes } = req.body;

    if (!["taken", "missed", "skipped"].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be "taken", "missed", or "skipped".' });
      return;
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      res.status(404).json({ success: false, message: "Medicine not found." });
      return;
    }

    // Create log entry
    const log = await MedicineLog.create({
      medicine: medicine._id,
      user: medicine.user,
      loggedBy: req.user?.id,
      status,
      scheduledTime: scheduledTime || new Date(),
      takenAt: status === "taken" ? (takenAt || new Date()) : null,
      notes: notes || "",
    });

    // If taken, reduce stock count
    if (status === "taken" && medicine.currentStock !== null) {
      medicine.currentStock = Math.max(0, medicine.currentStock - 1);

      // Flag if stock is low (Refill Guardian trigger)
      if (medicine.currentStock <= medicine.refillThreshold) {
        medicine.refillAlertSent = false; // will be picked up by cron job
      }

      await medicine.save();
    }

    res.status(201).json({ success: true, message: `Dose logged as ${status}.`, log });
  } catch (error: any) {
    console.error("[MEDICINE] LogDose error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/medicine/:id/logs
 * @desc    Get compliance logs for a specific medicine
 * @access  Private
 * @query   ?days=7 (default last 7 days)
 */
export const getMedicineLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await MedicineLog.find({
      medicine: req.params.id,
      scheduledTime: { $gte: since },
    }).sort({ scheduledTime: -1 });

    // Calculate compliance percentage
    const total = logs.length;
    const taken = logs.filter((l) => l.status === "taken").length;
    const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    res.status(200).json({
      success: true,
      complianceRate: `${complianceRate}%`,
      total,
      taken,
      missed: logs.filter((l) => l.status === "missed").length,
      skipped: logs.filter((l) => l.status === "skipped").length,
      logs,
    });
  } catch (error: any) {
    console.error("[MEDICINE] GetMedicineLogs error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   GET /api/medicine/compliance/summary
 * @desc    Overall compliance summary across all medicines for a user
 * @access  Private
 * @query   ?userId=<id>&days=30
 */
export const getComplianceSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
    const missed = logs.filter((l) => l.status === "missed").length;
    const skipped = logs.filter((l) => l.status === "skipped").length;
    const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    res.status(200).json({
      success: true,
      period: `Last ${days} days`,
      complianceRate: `${complianceRate}%`,
      total,
      taken,
      missed,
      skipped,
    });
  } catch (error: any) {
    console.error("[MEDICINE] GetComplianceSummary error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════
//  DOCTOR SLIP SCANNER
// ══════════════════════════════════════════════════════════

/**
 * @route   POST /api/medicine/scan-slip
 * @desc    Upload a doctor prescription image to be analyzed by Gemini AI.
 *          The image path is saved; AI analysis happens asynchronously or on-demand.
 * @access  Private
 * @form    slipImage (file)
 */
export const scanDoctorSlip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No image uploaded. Please attach a slip image." });
      return;
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/doctor-slips/${req.file.filename}`;

    // Save the slip reference in DB linked to the user
    // The medicine model stores the slip path; AI parsing is done separately
    const slipRecord = await Medicine.create({
      user: req.user?.id,
      addedBy: req.user?.id,
      name: "Pending AI Scan",
      dosage: "TBD",
      unit: "mg",
      frequency: "TBD",
      doctorSlipImage: imageUrl,
      isPendingAIScan: true,  // cron or on-demand Gemini call will process this
      isActive: false,        // not active until confirmed
      timesPerDay: [],
    });

    res.status(201).json({
      success: true,
      message: "Doctor slip uploaded. AI will analyze and populate medicine details.",
      slipImageUrl: imageUrl,
      medicineId: slipRecord._id,
      note: "Call POST /api/medicine/:id/analyze-slip to trigger AI analysis.",
    });
  } catch (error: any) {
    console.error("[MEDICINE] ScanDoctorSlip error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════
//  REFILL GUARDIAN
// ══════════════════════════════════════════════════════════

/**
 * @route   GET /api/medicine/refill-alerts
 * @desc    Get all medicines that are running low (below refill threshold)
 * @access  Private
 * @query   ?userId=<id>
 */
export const getRefillAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id;

    // Find medicines where current stock <= refill threshold
    const lowMedicines = await Medicine.find({
      user: targetUserId,
      isActive: true,
      $expr: {
        $and: [
          { $ne: ["$currentStock", null] },
          { $lte: ["$currentStock", "$refillThreshold"] },
        ],
      },
    });

    const alerts = lowMedicines.map((med) => ({
      medicineId: med._id,
      name: med.name,
      dosage: `${med.dosage} ${med.unit}`,
      currentStock: med.currentStock,
      refillThreshold: med.refillThreshold,
      urgency: med.currentStock === 0 ? "CRITICAL" : med.currentStock! <= 3 ? "HIGH" : "MEDIUM",
    }));

    res.status(200).json({
      success: true,
      count: alerts.length,
      refillAlerts: alerts,
    });
  } catch (error: any) {
    console.error("[MEDICINE] GetRefillAlerts error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * @route   PUT /api/medicine/:id/restock
 * @desc    Update stock after a refill
 * @access  Private
 * @body    { quantity: number }
 */
export const restockMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, message: "Provide a valid restock quantity." });
      return;
    }

    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: req.user?.id }, { addedBy: req.user?.id }] },
      {
        $inc: { currentStock: quantity },
        refillAlertSent: false,
        lastRestockedAt: new Date(),
      },
      { new: true }
    );

    if (!medicine) {
      res.status(404).json({ success: false, message: "Medicine not found or access denied." });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Stock updated. New stock: ${medicine.currentStock}`,
      medicine,
    });
  } catch (error: any) {
    console.error("[MEDICINE] RestockMedicine error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
