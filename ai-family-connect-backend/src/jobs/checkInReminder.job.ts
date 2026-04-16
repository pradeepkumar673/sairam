/**
 * jobs/checkInReminder.job.ts
 * Daily check-in nudge — runs at 8 AM for elders who haven't checked in
 */

import cron from "node-cron";
import User from "../models/User";
import CheckIn from "../models/CheckIn";
import { getIO } from "../config/socket";
import { emitUserAlert, emitFamilyAlert } from "../sockets/alert.socket";

export const startCheckInReminderJob = (): void => {
  cron.schedule("0 8 * * *", async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find elder/student users who haven't checked in today
      const users = await User.find({
        role: { $in: ["elder", "student"] },
        isActive: true,
      }).select("_id name familyId");

      const io = getIO();

      for (const user of users) {
        const userId = (user._id as any).toString();

        const checkedIn = await CheckIn.findOne({
          userId,
          createdAt: { $gte: today },
        });

        if (!checkedIn) {
          emitUserAlert(io, userId, "checkin:reminder", {
            type: "CHECKIN_REMINDER",
            severity: "info",
            message: `👋 Good morning, ${user.name}! Don't forget to check in today.`,
          });
        }
      }
    } catch (err) {
      console.error("❌ Check-in reminder job error:", err);
    }
  });

  console.log("✅ Check-in reminder cron job started (runs daily at 8 AM)");
};

/**
 * No check-in alert to family — runs at 10 AM
 * If elder hasn't checked in by 10 AM, alert family
 */
export const startNoCheckInAlertJob = (): void => {
  cron.schedule("0 10 * * *", async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const elders = await User.find({ role: "elder", isActive: true })
        .select("_id name familyId");

      const io = getIO();

      for (const elder of elders) {
        const userId = (elder._id as any).toString();
        const familyId = elder.familyId?.toString();

        if (!familyId) continue;

        const checkedIn = await CheckIn.findOne({
          userId,
          createdAt: { $gte: today },
        });

        if (!checkedIn) {
          emitFamilyAlert(io, familyId, "alert:no_checkin", {
            type: "NO_CHECKIN",
            severity: "warning",
            forUserId: userId,
            forUserName: elder.name,
            message: `⚠️ ${elder.name} hasn't checked in today. Please check on them.`,
          });
        }
      }
    } catch (err) {
      console.error("❌ No check-in alert job error:", err);
    }
  });

  console.log("✅ No check-in family alert job started (runs daily at 10 AM)");
};
