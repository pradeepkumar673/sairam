/**
 * src/app.ts
 * Express application factory — mounts all routes and middleware
 */

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { generalLimiter, authLimiter, aiLimiter } from "./middleware/rateLimiter.middleware";
import { AppError } from "./utils/AppError";
import { detectLang, t } from "./utils/i18n";

// ── Route imports ─────────────────────────────────────────────────
import authRoutes from "./routes/auth.routes";
import familyRoutes from "./routes/family.routes";
import chatRoutes from "./routes/chat.routes";
import aiRoutes from "./routes/ai.routes";
import alertRoutes from "./routes/alert.routes";
import healthRoutes from "./routes/health.routes";
import locationRoutes from "./routes/location.routes";
import memoryRoutes from "./routes/memory.routes";
import messageRoutes from "./routes/message.routes";
import notificationRoutes from "./routes/notification.routes";
import safeZoneRoutes from "./routes/safeZone.routes";
import sosRoutes from "./routes/sos.routes";
import taskRoutes from "./routes/task.routes";
import userRoutes from "./routes/user.routes";
import checkInRoutes from "./routes/checkIn.routes";
import eventRoutes from "./routes/event.routes";
import expenseRoutes from "./routes/expense.routes";
import adminRoutes from "./routes/admin.routes";

export const createApp = (): Application => {
  const app = express();

  // ── Security & Parsing ───────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow frontend image loads
  }));

  app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // ── Static file serving (uploads) ───────────────────────────
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // ── Apply global rate limiter ────────────────────────────────
  app.use("/api", generalLimiter);

  // ── Health check (no auth, no limiter) ──────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "AI Family Connect API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // ── API Routes ───────────────────────────────────────────────
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/family", familyRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/ai", aiLimiter, aiRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/health-records", healthRoutes);
  app.use("/api/location", locationRoutes);
  app.use("/api/memory", memoryRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/safe-zones", safeZoneRoutes);
  app.use("/api/sos", sosRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/checkin", checkInRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/admin", adminRoutes);

  // ── 404 Handler ──────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const lang = detectLang(req.headers["accept-language"]);
    next(new AppError(t("not_found", lang), 404));
  });

  // ── Global Error Handler ─────────────────────────────────────
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const lang = detectLang(req.headers["accept-language"], (req as any).user?.language);
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational === true;

    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error:", err);
    }

    res.status(statusCode).json({
      success: false,
      statusCode,
      message: isOperational ? err.message : t("server_error", lang),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  return app;
};
