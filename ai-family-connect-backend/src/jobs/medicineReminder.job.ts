import cron from "node-cron";
import Medicine from "../models/Medicine";
import MedicineLog from "../models/MedicineLog";
import { getIO } from "../config/socket";

const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

export const startMedicineReminderJob = (): void => {
  cron.schedule("* * * * *", async () => {
    const currentTime = getCurrentTimeString();
    const medicines = await Medicine.find({
      isActive: true,
      scheduledTimes: currentTime,
    }).populate("user", "_id firstName");

    const io = getIO();
    for (const med of medicines) {
      const user = med.user as any;
      if (!user) continue;
      io.to(`user:${user._id}`).emit("medicine:reminder", {
        medicineId: med._id,
        name: med.name,
        dosage: med.dosage,
        message: `Time to take ${med.name} (${med.dosage} ${med.unit})`,
        timestamp: new Date().toISOString(),
      });
    }
  });
  console.log("✅ Medicine reminder cron started");
};

export const startMissedDoseJob = (): void => {
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const missedTime = `${String(fifteenMinutesAgo.getHours()).padStart(2, "0")}:${String(fifteenMinutesAgo.getMinutes()).padStart(2, "0")}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const medicines = await Medicine.find({
      isActive: true,
      scheduledTimes: missedTime,
    }).populate("user", "_id firstName");

    for (const med of medicines) {
      const user = med.user as any;
      if (!user) continue;

      const logExists = await MedicineLog.findOne({
        medicine: med._id,
        scheduledTime: { $gte: today },
      });
      if (logExists) continue;

      await MedicineLog.create({
        medicine: med._id,
        user: user._id,
        loggedBy: user._id,
        status: "missed",
        scheduledTime: fifteenMinutesAgo,
      });

      const io = getIO();
      io.to(`user:${user._id}`).emit("medicine:missed", {
        medicineId: med._id,
        name: med.name,
        message: `You missed your ${med.name} dose at ${missedTime}.`,
        timestamp: new Date().toISOString(),
      });
    }
  });
  console.log("✅ Missed dose checker cron started");
};

export const startRefillReminderJob = (): void => {
  cron.schedule("0 9 * * *", async () => {
    const lowStock = await Medicine.find({
      isActive: true,
      currentStock: { $lte: 5 },
    }).populate("user", "_id firstName");

    const io = getIO();
    for (const med of lowStock) {
      const user = med.user as any;
      io.to(`user:${user._id}`).emit("medicine:low_stock", {
        medicineId: med._id,
        name: med.name,
        stock: med.currentStock,
        message: `Low stock: ${med.name} (${med.currentStock} left). Please refill.`,
        timestamp: new Date().toISOString(),
      });
    }
  });
  console.log("✅ Refill reminder cron started");
};