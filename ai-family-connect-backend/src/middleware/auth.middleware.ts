import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "elder" | "student" | "family";
    email: string;
  };
}

/**
 * protectRoute middleware
 * Validates JWT from Authorization header and attaches user info to request.
 * Usage: router.get("/protected", protectRoute, controller)
 */
export const protectRoute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists and has Bearer token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "No token provided. Access denied." });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: "elder" | "student" | "family";
      email: string;
    };

    // Check if user still exists in DB (in case account was deleted)
    const userExists = await User.findById(decoded.id).select("_id role email");
    if (!userExists) {
      res.status(401).json({ success: false, message: "User no longer exists." });
      return;
    }

    // Attach decoded user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ success: false, message: "Token expired. Please log in again." });
      return;
    }
    res.status(401).json({ success: false, message: "Invalid token." });
  }
};

/**
 * restrictTo middleware
 * Restricts access to specific roles.
 * Usage: router.get("/elder-only", protectRoute, restrictTo("elder"), controller)
 */
export const restrictTo = (...roles: Array<"elder" | "student" | "family">) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(", ")}`,
      });
      return;
    }
    next();
  };
};
