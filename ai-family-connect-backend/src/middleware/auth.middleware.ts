import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";
import User from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError("No token provided.", 401));
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new AppError("User not found.", 401));
    (req as any).user = user;
    next();
  } catch {
    next(new AppError("Invalid token.", 401));
  }
};

export const verifySocketToken = async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
  try {
    const raw = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string) || "";
    const token = raw.startsWith("Bearer ") ? raw.split(" ")[1] : raw;
    if (!token) return next(new Error("No token provided."));
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.id).select("_id firstName lastName role");
    if (!user) return next(new Error("User not found."));
    socket.data.userId = user._id.toString();
    socket.data.name = user.fullName();
    socket.data.role = user.role;
    next();
  } catch {
    next(new Error("Invalid token."));
  }
};