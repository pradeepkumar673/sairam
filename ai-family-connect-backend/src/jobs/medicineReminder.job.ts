/**
 * jobs/medicineReminder.job.ts
 * Cron job: checks medicine schedules and emits real-time alerts
 * Runs every minute to catch all scheduled dose times
 */

import cron from "node-cron";
import Medicine from "../models/Medicine";
import { MedicineLog } from "../models/MedicineLog";
import { getIO } from "../config/socket";
import { emitFamilyAlert, emitUserAlert } from "../sockets/alert.socket";

/**
 * Compare current HH:MM with scheduled dose times (stored as "HH:MM" strings)
 */
const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

/**
 * Main reminder job — fires every minute
 */
export const startMedicineReminderJob = (): void => {
  cron.schedule("* * * * *", async () => {
    const currentTime = getCurrentTimeString();

    try {
      // Find all active medicines whose schedule contains the current time
      const medicines = await Medicine.find({
        isActive: true,
        scheduleTimes: currentTime, // array of "HH:MM" strings
      }).populate("userId", "_id name familyId");

      for (const med of medicines) {
        const user = med.userId as any;
        if (!user) continue;

        const userId = user._id.toString();
        const familyId = user.familyId?.toString();

        // Check if already logged as taken today at this time
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alreadyTaken = await MedicineLog.findOne({
          medicineId: med._id,
          userId,
          scheduledTime: currentTime,
          takenAt: { $gte: today },
          status: "taken",
        });

        if (alreadyTaken) continue; // already handled

        // Emit reminder directly to the user
        const io = getIO();
        emitUserAlert(io, userId, "medicine:reminder", {
          type: "MEDICINE_REMINDER",
          severity: "info",
          medicineId: med._id,
          medicineName: med.name,
          dosage: med.dosage,
          scheduledTime: currentTime,
          message: `💊 Time to take ${med.name} (${med.dosage})`,
        });

        // Also alert the family room so caregivers know
        if (familyId) {
          emitFamilyAlert(io, familyId, "medicine:reminder_family", {
            type: "MEDICINE_REMINDER",
            severity: "info",
            forUserId: userId,
            forUserName: user.name,
            medicineName: med.name,
            dosage: med.dosage,
            scheduledTime: currentTime,
            message: `💊 ${user.name} should take ${med.name} now.`,
          });
        }
      }
    } catch (err) {
      console.error("❌ Medicine reminder job error:", err);
    }
  });

  console.log("✅ Medicine reminder cron job started (runs every minute)");
};

/**
 * Missed dose checker — runs every 15 minutes
 * If a medicine was scheduled >15min ago and no log exists → missed
 */
export const startMissedDoseJob = (): void => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const missedTime = `${String(fifteenMinutesAgo.getHours()).padStart(2, "0")}:${String(fifteenMinutesAgo.getMinutes()).padStart(2, "0")}`;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const medicines = await Medicine.find({
        isActive: true,
        scheduleTimes: missedTime,
      }).populate("userId", "_id name familyId");

      for (const med of medicines) {
        const user = med.userId as any;
        if (!user) continue;

        const userId = user._id.toString();
        const familyId = user.familyId?.toString();

        const logExists = await MedicineLog.findOne({
          medicineId: med._id,
          userId,
          scheduledTime: missedTime,
          takenAt: { $gte: today },
        });

        if (logExists) continue; // dose was recorded

        // Log as missed
        await MedicineLog.create({
          medicineId: med._id,
          userId,
          scheduledTime: missedTime,
          status: "missed",
        });

        const io = getIO();

        // Alert user
        emitUserAlert(io, userId, "medicine:missed", {
          type: "MEDICINE_MISSED",
          severity: "warning",
          medicineId: med._id,
          medicineName: med.name,
          scheduledTime: missedTime,
          message: `⚠️ You missed your ${med.name} dose scheduled at ${missedTime}.`,
        });

        // Alert family
        if (familyId) {
          emitFamilyAlert(io, familyId, "alert:medicine_missed", {
            type: "MEDICINE_MISSED",
            severity: "warning",
            forUserId: userId,
            forUserName: user.name,
            medicineName: med.name,
            scheduledTime: missedTime,
            message: `⚠️ ${user.name} missed their ${med.name} dose at ${missedTime}.`,
          });
        }
      }
    } catch (err) {
      console.error("❌ Missed dose checker error:", err);
    }
  });

  console.log("✅ Missed dose cron job started (runs every 15 minutes)");
};

/**
 * Low stock refill reminder — runs once daily at 9 AM
 */
export const startRefillReminderJob = (): void => {
  cron.schedule("0 9 * * *", async () => {
    try {
      const lowStockMeds = await Medicine.find({
        isActive: true,
        stockCount: { $lte: 5 },
      }).populate("userId", "_id name familyId");

      const io = getIO();

      for (const med of lowStockMeds) {
        const user = med.userId as any;
        if (!user) continue;

        const userId = user._id.toString();
        const familyId = user.familyId?.toString();

        emitUserAlert(io, userId, "medicine:low_stock", {
          type: "LOW_STOCK",
          severity: "warning",
          medicineId: med._id,
          medicineName: med.name,
          stockCount: med.stockCount,
          message: `🔴 Only ${med.stockCount} doses of ${med.name} remaining. Please refill soon.`,
        });

        if (familyId) {
          emitFamilyAlert(io, familyId, "alert:low_medicine", {
            type: "LOW_STOCK",
            severity: "warning",
            forUserId: userId,
            forUserName: user.name,
            medicineName: med.name,
            stockCount: med.stockCount,
            message: `🔴 ${user.name}'s ${med.name} is running low (${med.stockCount} left).`,
          });
        }
      }
    } catch (err) {
      console.error("❌ Refill reminder job error:", err);
    }
  });

  console.log("✅ Refill reminder cron job started (runs daily at 9 AM)");
};
