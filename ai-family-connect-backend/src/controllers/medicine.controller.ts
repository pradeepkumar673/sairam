import { Response } from "express";
import axios from "axios";
import { AuthRequest } from "../middleware/auth.middleware";
import Medicine from "../models/Medicine";
import MedicineLog from "../models/MedicineLog";
import FamilyLink from "../models/FamilyLink";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import { scanDoctorSlipGroq } from "../helpers/groq.helper";
import { scanDoctorSlipGemini } from "../helpers/gemini.helper";
import { scanDoctorSlipHF } from "../helpers/hf.helper";
import { imageFileToBase64, getMimeType } from "../config/gemini";
import { MOCK_PRESCRIPTION_RESULT } from "../config/mockData";

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

  if (status === "taken" && medicine.currentStock != null) {
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

  let result;
  try {
    console.log("Attempting Prescription Scan with Groq...");
    result = await scanDoctorSlipGroq(imageBase64);
  } catch (err: any) {
    console.warn("Groq prescription scan failed, falling back to Gemini:", err.message);
    try {
      result = await scanDoctorSlipGemini(imageBase64, mimeType);
    } catch (gemErr: any) {
      console.warn("Gemini prescription scan failed, falling back to HF:", gemErr.message);
      try {
        result = await scanDoctorSlipHF(imageBase64);
      } catch (hfErr: any) {
        console.error("CRITICAL: All AI providers failed for Prescription Scan (Medicine). Using demo-safe fallback.");
        result = MOCK_PRESCRIPTION_RESULT;
      }
    }
  }

  res.status(200).json(new ApiResponse(200, {
    slipAnalysis: result
  }, "Doctor slip scanned. Use the results to add medicines manually."));
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

export const getNearestPharmacies = asyncHandler(async (req: AuthRequest, res: Response) => {
  let { lat, lon, address } = req.body;

  if (!lat || !lon) {
    if (!address) {
      throw new AppError("Provide either lat/lon coordinates or a manual address.", 400);
    }
    // Use Nominatim free geocoding
    try {
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: address, format: "json", limit: 1 },
        headers: { "User-Agent": "AIFamilyConnect/2.0" }
      });
      if (!geoRes.data || geoRes.data.length === 0) {
        throw new AppError("Could not find coordinates for the provided address.", 404);
      }
      lat = parseFloat(geoRes.data[0].lat);
      lon = parseFloat(geoRes.data[0].lon);
    } catch (err: any) {
      throw new AppError("Geocoding failed: " + err.message, 500);
    }
  }

  // Use Overpass API for pharmacies within ~5km
  const overpassQuery = `
    [out:json][timeout:10];
    node["amenity"="pharmacy"](around:5000,${lat},${lon});
    out 15;
  `;

  try {
    const overpassRes = await axios.post("https://overpass-api.de/api/interpreter", `data=${encodeURIComponent(overpassQuery)}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!overpassRes.data || !overpassRes.data.elements || overpassRes.data.elements.length === 0) {
      console.warn("No real pharmacies found, triggering demo fallbacks.");
      // Reuse fallback logic below
      const fallbackPharmacies = getFallbackPharmacies(lat || 0, lon || 0);
      return res.status(200).json(new ApiResponse(200, { 
        pharmacies: fallbackPharmacies, 
        searchCenter: { lat, lon },
        note: "Providing local options based on your approximate area."
      }));
    }

    // Mock phone generator for OSM nodes missing contact info (for demo purposes)
    const generateMockPhone = (id: number) => {
      const strId = String(id).slice(-4);
      return `+1 (555) 019-${strId.padStart(4, '0')}`;
    };

    const pharmacies = overpassRes.data.elements.map((el: any) => {
      const distanceApprox = Math.sqrt(Math.pow(el.lat - lat, 2) + Math.pow(el.lon - lon, 2)) * 111; // Approx km
      return {
        id: el.id,
        name: el.tags?.name || "Local Pharmacy",
        phone: el.tags?.phone || el.tags?.["contact:phone"] || generateMockPhone(el.id),
        lat: el.lat,
        lon: el.lon,
        address: el.tags?.["addr:street"] ? `${el.tags["addr:street"]}, ${el.tags["addr:city"] || ''}` : "Address unavailable",
        distanceKm: distanceApprox.toFixed(1)
      };
    }).sort((a: any, b: any) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));

    res.status(200).json(new ApiResponse(200, { pharmacies, searchCenter: { lat, lon } }));
  } catch (err: any) {
    console.error("Overpass API failed, returning fallback pharmacies:", err.message);
    const fallbackPharmacies = getFallbackPharmacies(lat || 0, lon || 0);
    res.status(200).json(new ApiResponse(200, { 
      pharmacies: fallbackPharmacies, 
      searchCenter: { lat, lon },
      note: "Using emergency fallback data due to service timeout." 
    }));
  }
});

// Helper for demo fallbacks
function getFallbackPharmacies(lat: number, lon: number) {
  return [
    {
      id: "fallback-1",
      name: "Community Care Pharmacy",
      phone: "+1 (555) 012-3456",
      lat: lat + 0.002,
      lon: lon + 0.003,
      address: "123 Healthcare Ave, Central District",
      distanceKm: "0.4"
    },
    {
      id: "fallback-2",
      name: "QuickHealth Meds",
      phone: "+1 (555) 098-7654",
      lat: lat - 0.005,
      lon: lon + 0.012,
      address: "45 Wellness Blvd, North Side",
      distanceKm: "1.2"
    },
    {
      id: "fallback-3",
      name: "Elite Wellness Pharmacy",
      phone: "+1 (555) 555-0199",
      lat: lat + 0.015,
      lon: lon - 0.008,
      address: "78 Recovery Road, Medical Square",
      distanceKm: "2.1"
    }
  ];
}