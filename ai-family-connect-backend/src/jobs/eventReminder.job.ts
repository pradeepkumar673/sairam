/**
 * jobs/eventReminder.job.ts
 * Reminds family about upcoming events 1 hour before they start
 */

import cron from "node-cron";
import { Event } from "../models/Event";
import { getIO } from "../config/socket";
import { emitFamilyAlert } from "../sockets/alert.socket";

export const startEventReminderJob = (): void => {
  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

      // Events starting in the next 5-60 minutes that haven't been reminded
      const upcomingEvents = await Event.find({
        startTime: { $gte: fiveMinutesLater, $lte: oneHourLater },
        isReminderSent: false,
      }).lean();

      const io = getIO();

      for (const event of upcomingEvents) {
        const familyId = event.familyId?.toString();
        if (!familyId) continue;

        const minutesUntil = Math.round(
          (new Date(event.startTime).getTime() - now.getTime()) / 60000
        );

        emitFamilyAlert(io, familyId, "alert:event_reminder", {
          type: "EVENT_REMINDER",
          severity: "info",
          eventId: event._id,
          eventTitle: event.title,
          startTime: event.startTime,
          message: `📅 Reminder: "${event.title}" starts in ${minutesUntil} minutes.`,
        });

        // Mark as reminded to avoid duplicate alerts
        await (Event as any).findByIdAndUpdate(event._id, { isReminderSent: true });
      }
    } catch (err) {
      console.error("❌ Event reminder job error:", err);
    }
  });

  console.log("✅ Event reminder cron job started (runs every 5 minutes)");
};
