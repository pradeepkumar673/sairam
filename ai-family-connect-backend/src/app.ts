/**
 * src/app.ts
 * Express application factory — mounts all routes and middleware
 */

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { AppError } from "./utils/AppError";
import { detectLang, t } from "./utils/i18n";

import authRoutes from "./routes/auth.routes";
import familyRoutes from "./routes/family.routes";
import medicineRoutes from "./routes/medicine.routes";
import safetyRoutes from "./routes/safety.routes";
import aiRoutes from "./routes/ai.routes";
import chatRoutes from "./routes/chat.routes";

export const createApp = (): Application => {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "AI Family Connect API",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/family", familyRoutes);
  app.use("/api/medicine", medicineRoutes);
  app.use("/api/safety", safetyRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/chat", chatRoutes);

  // 404 Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const lang = detectLang(req.headers["accept-language"]);
    next(new AppError(t("not_found", lang), 404));
  });

  // Global Error Handler
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