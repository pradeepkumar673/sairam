/**
 * app.ts
 * Express application setup
 */

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Import Route Handlers
import chatRoutes from "./routes/chat.routes";
import aiRoutes from "./routes/ai.routes";

const app: Application = express();

// ── Global Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Route Registrations ───────────────────────────────────────────
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);

// Export the configured express app
export default app;
