/**
 * middleware/auth.middleware.ts
 * JWT authentication for HTTP routes AND Socket.io connections
 */

import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";
import User from "../models/User";

interface JwtPayload {
  id: string;
  familyId?: string;
  role?: string;
}

// ── HTTP Route Middleware ─────────────────────────────────────────
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("No token provided. Please log in.", 401));
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new AppError("User no longer exists.", 401));

    (req as any).user = user;
    next();
  } catch (err) {
    next(new AppError("Invalid or expired token.", 401));
  }
};

// ── Socket.io Middleware ──────────────────────────────────────────
export const verifySocketToken = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // Client sends token via auth: { token: "Bearer ..." } or handshake query
    const raw =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.query?.token as string) ||
      "";

    const token = raw.startsWith("Bearer ") ? raw.split(" ")[1] : raw;

    if (!token) {
      return next(new Error("Authentication error: No token provided."));
    }

    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id).select("_id name familyId role");
    if (!user) return next(new Error("Authentication error: User not found."));

    // Attach user info to socket.data for use in handlers
    socket.data.userId = (user._id as any).toString();
    socket.data.familyId = (user as any).familyId?.toString();
    socket.data.role = user.role;
    socket.data.name = user.name;

    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token."));
  }
};

// ── Role-based guard ──────────────────────────────────────────────
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!roles.includes(user.role)) {
      return next(new AppError("You do not have permission for this action.", 403));
    }
    next();
  };
};
