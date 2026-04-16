/**
 * server.ts
 * Entry point: creates HTTP server, attaches Socket.io, connects DB, starts cron jobs
 */

import "dotenv/config";
import http from "http";
import { createApp } from "./src/app";
import { connectDB } from "./src/config/db";
import { initSocket } from "./src/config/socket";

// Cron jobs
import { startMedicineReminderJob, startMissedDoseJob, startRefillReminderJob } from "./src/jobs/medicineReminder.job";

const PORT = parseInt(process.env.PORT || "5000", 10);

const start = async (): Promise<void> => {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  startMedicineReminderJob();
  startMissedDoseJob();
  startRefillReminderJob();

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`📡 REST API  → http://localhost:${PORT}/api`);
    console.log(`🔌 Socket.io → ws://localhost:${PORT}`);
    console.log(`❤️  Health   → http://localhost:${PORT}/health\n`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log("✅ HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    console.error("⚠️ Unhandled Rejection:", reason);
    shutdown("unhandledRejection");
  });
};

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});